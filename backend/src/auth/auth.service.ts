// backend_src_auth_auth_service.ts
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { VerificationCodeType, User as PrismaUser } from '@prisma/client';
import { ChangePasswordInput } from './dto/change-password.input';
import { EventsGateway } from '../events/events.gateway'; 

 const parseUserAgent = (ua: string) => {
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let device = 'Desktop';

  if (ua.includes('Win')) os = 'Windows';
  if (ua.includes('Mac')) os = 'MacOS';
  if (ua.includes('Linux')) os = 'Linux';
  if (ua.includes('Android')) { os = 'Android'; device = 'Mobile'; }
  if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; device = 'Mobile'; }

  if (ua.includes('Chrome')) browser = 'Chrome';
  if (ua.includes('Firefox')) browser = 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  if (ua.includes('Edg')) browser = 'Edge';

  return { os, browser, device };
};

const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 минут
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; firstAt: number }>();

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private eventsGateway: EventsGateway,
  ) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-значный код
  }
  
  async login(user: any, ip: string = '127.0.0.1', userAgent: string = '') {
    const payload = { username: user.username, sub: user.id };
    const token = this.jwtService.sign(payload);

    const uaInfo = parseUserAgent(userAgent);
    const newSession = await this.prisma.session.create({ // 3. Сохраняем сессию в переменную
      data: {
        userId: user.id,
        token: token,
        ip: ip,
        userAgent: userAgent,
        os: uaInfo.os,
        browser: uaInfo.browser,
        device: uaInfo.device,
        city: 'Москва', 
      }
    });

    // 4. Отправляем уведомление всем остальным сессиям этого пользователя
    this.eventsGateway.sendNewSessionNotification(user.id, newSession, token);

    return {
      access_token: token,
      user,
    };
  }

  // НОВЫЙ МЕТОД: Смена пароля (если старый известен)
  async changePassword(userId: number, input: ChangePasswordInput): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const isMatch = await bcrypt.compare(input.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Старый пароль неверен');
    }

    this.validatePasswordStrength(input.newPassword);

    const hashedPassword = await bcrypt.hash(input.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return true;
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 6) {
      throw new BadRequestException('Пароль должен содержать минимум 6 символов.');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Пароль должен содержать минимум одну строчную букву.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Пароль должен содержать минимум одну заглавную букву.');
    }
    if (!/[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(password)) {
      throw new BadRequestException('Пароль должен содержать минимум один специальный символ.');
    }
  }

  // Убедитесь, что метод объявлен как public
  public async sendVerificationCodeAndResponse(user: PrismaUser): Promise<{ emailSent: boolean; userId: number }> {
    await this.prisma.verificationCode.deleteMany({
      where: { userId: user.id, type: VerificationCodeType.EMAIL_VERIFICATION },
    });

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

    await this.prisma.verificationCode.create({
      data: {
        code,
        type: VerificationCodeType.EMAIL_VERIFICATION,
        expiresAt,
        userId: user.id,
      },
    });
    // --- ИСПРАВЛЕНИЕ: Передаем userId в sendVerificationCode ---
    await this.emailService.sendVerificationCode(user.email, code, user.id);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    return { emailSent: true, userId: user.id };
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const key = email.toLowerCase().trim();
    const now = Date.now();
    const info = loginAttempts.get(key);

    if (info && now - info.firstAt < LOGIN_WINDOW_MS && info.count >= LOGIN_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Слишком много попыток входа. Попробуйте позже.');
    }

    const user = await this.usersService.findOne(email);
    if (!user) {
      loginAttempts.set(key, {
        count: info ? info.count + 1 : 1,
        firstAt: info ? info.firstAt : now,
      });
      throw new UnauthorizedException('Неверный email или пароль.');
    }
    if (!user.isVerified) {
        throw new UnauthorizedException('Ваш аккаунт не верифицирован. Пожалуйста, подтвердите email.');
    }

    if (user && (await bcrypt.compare(pass, user.password))) {
      // успешный вход — сбрасываем счётчик попыток
      if (info) {
        loginAttempts.delete(key);
      }
      const { password, ...result } = user;
      return result;
    }

    loginAttempts.set(key, {
      count: info ? info.count + 1 : 1,
      firstAt: info ? info.firstAt : now,
    });
    throw new UnauthorizedException('Неверный email или пароль.');
  }

  async register(data: any): Promise<{ emailSent: boolean; userId: number } | { access_token: string; user: any }> {
    const existingUserByEmail = await this.usersService.findOne(data.email);
    if (existingUserByEmail) {
      if (!existingUserByEmail.isVerified) {
        // Если пользователь существует, но не верифицирован, отправляем новый код
        return this.sendVerificationCodeAndResponse(existingUserByEmail);
      }
      throw new ConflictException('Пользователь с таким email уже существует.');
    }
    const existingUserByUsername = await this.usersService.findByUsername(data.username);
    if (existingUserByUsername) {
      throw new ConflictException('Имя пользователя уже занято.');
    }

    this.validatePasswordStrength(data.password);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({
      ...data,
      password: hashedPassword,
      isVerified: false,
    });

    return this.sendVerificationCodeAndResponse(user);
  }

  async confirmEmail(userId: number, code: string): Promise<{ access_token: string; user: any }> {
    const verification = await this.prisma.verificationCode.findFirst({
      where: {
        userId,
        code,
        type: VerificationCodeType.EMAIL_VERIFICATION,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verification) {
      throw new BadRequestException('Неверный или просроченный код подтверждения.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    await this.prisma.verificationCode.delete({
      where: { id: verification.id },
    });

    return this.login(verification.user);
  }

  async requestPasswordReset(email: string): Promise<{ emailSent: boolean }> {
    const user = await this.usersService.findOne(email);
    if (!user) {
      return { emailSent: true };
    }

    await this.prisma.verificationCode.deleteMany({
      where: { userId: user.id, type: VerificationCodeType.PASSWORD_RESET },
    });

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.verificationCode.create({
      data: {
        code,
        type: VerificationCodeType.PASSWORD_RESET,
        expiresAt,
        userId: user.id,
      },
    });

    await this.emailService.sendPasswordResetCode(user.email, code);

    return { emailSent: true };
  }

  async resetPassword(email: string, code: string, newPasswordPlain: string): Promise<{ success: boolean }> {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new BadRequestException('Неверный email или код восстановления.');
    }

    const verification = await this.prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code,
        type: VerificationCodeType.PASSWORD_RESET,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new BadRequestException('Неверный или просроченный код восстановления.');
    }

    this.validatePasswordStrength(newPasswordPlain);

    const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.prisma.verificationCode.delete({
      where: { id: verification.id },
    });

    return { success: true };
  }
}