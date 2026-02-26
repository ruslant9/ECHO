// backend_src_auth_auth_resolver.ts
import { Resolver, Mutation, Args, Int, Query } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginResponse } from './dto/login-response';
import { LoginUserInput } from './dto/login-user.input';
import { RegisterUserInput } from './dto/register-user.input';
import { ConfirmEmailInput } from './dto/confirm-email.input';
import { RequestPasswordResetInput } from './dto/request-password-reset.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { User } from '../users/models/user.model';
import { Context } from '@nestjs/graphql';
import { ChangePasswordInput } from './dto/change-password.input';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Resolver(() => User)
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => LoginResponse)
  async login(
    @Args('loginUserInput') loginUserInput: LoginUserInput,
    @Context() context // Получаем контекст запроса
  ): Promise<LoginResponse> {
    
    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
    
    // Извлекаем IP и User-Agent из контекста
    const req = context.req;
    const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown';
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    try {
      const user = await this.authService.validateUser(
        loginUserInput.email,
        loginUserInput.password,
      );
      // Передаем извлеченные ip и userAgent в сервис
      return this.authService.login(user, ip, userAgent);
    } catch (error) {
       // ... ваша логика обработки ошибок остается без изменений ...
      if (error instanceof UnauthorizedException && error.message === 'Ваш аккаунт не верифицирован. Пожалуйста, подтвердите email.') {
        const user = await this.authService['usersService'].findOne(loginUserInput.email);
        if (user) {
            return this.authService.sendVerificationCodeAndResponse(user);
        }
      }
      throw error;
    }

    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
  }

  // Изменяем тип возвращаемого значения для register, confirmEmail и requestPasswordReset на LoginResponse
  @Mutation(() => LoginResponse)
  async register(@Args('registerUserInput') registerUserInput: RegisterUserInput): Promise<LoginResponse> {
    const response = await this.authService.register(registerUserInput);
    return response;
  }

  @Mutation(() => LoginResponse)
  async confirmEmail(@Args('confirmEmailInput') confirmEmailInput: ConfirmEmailInput): Promise<LoginResponse> {
    return this.authService.confirmEmail(confirmEmailInput.userId, confirmEmailInput.code);
  }

  @Mutation(() => LoginResponse)
  async requestPasswordReset(@Args('requestPasswordResetInput') requestPasswordResetInput: RequestPasswordResetInput): Promise<LoginResponse> {
    const response = await this.authService.requestPasswordReset(requestPasswordResetInput.email);
    // requestPasswordReset возвращает { emailSent: true }, что совместимо с LoginResponse
    return response;
  }

  @Mutation(() => Boolean)
  async resetPassword(@Args('resetPasswordInput') resetPasswordInput: ResetPasswordInput) {
    const { email, code, newPassword } = resetPasswordInput;
    const result = await this.authService.resetPassword(email, code, newPassword);
    return result.success;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Args('input') input: ChangePasswordInput,
    @Context() context
  ) {
    return this.authService.changePassword(context.req.user.userId, input);
  }
}