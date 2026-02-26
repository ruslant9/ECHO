// backend_src_email_email_service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import 'dotenv/config';
import { PrismaService } from '../prisma.service';
import { VerificationCodeType } from '@prisma/client';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly senderEmail: string;
  private readonly appUrl: string;

  constructor(
      private prisma: PrismaService
  ) {
    this.senderEmail = process.env.GOOGLE_USER_EMAIL;
    const appPassword = process.env.GOOGLE_APP_PASSWORD;
    this.appUrl = process.env.APP_URL || 'http://localhost:3000'; // URL вашего приложения

    if (!this.senderEmail || !appPassword) {
      throw new InternalServerErrorException('Email service configuration missing.');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.senderEmail,
        pass: appPassword,
      },
    });
  }

  private generateVerificationLink(userId: number, code: string): string {
      return `${this.appUrl}/auth/confirm-email?userId=${userId}&code=${code}`;
  }
  
  async sendVerificationCode(to: string, code: string, userId: number): Promise<void> {
    const verificationLink = this.generateVerificationLink(userId, code);

    try {
      await this.transporter.sendMail({
        from: `ECHO App <${this.senderEmail}>`,
        to: to,
        subject: 'ECHO: Подтвердите ваш email',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #fff; padding: 20px; border-radius: 12px; max-width: 600px; margin: 20px auto; border: 1px solid #e4e4e7;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <img src="${this.appUrl}/echo-logo.png" alt="ECHO Logo" style="width: 40px; height: 40px; border-radius: 50%;">
              <h1 style="font-size: 24px; font-weight: bold; color: #181818;">ECHO</h1>
            </div>
            <h2 style="font-size: 28px; font-weight: bold; margin-bottom: 12px; color: #181818;">Добро пожаловать в ECHO!</h2>
            <p style="margin-bottom: 16px; color: #333;">Спасибо за регистрацию! Чтобы завершить ее, пожалуйста, подтвердите ваш адрес электронной почты.</p>
            
            <div style="background-color: #f4f4f5; padding: 15px 20px; border-radius: 10px; display: inline-block; border: 1px dashed #e4e4e7;">
              <p style="font-size: 14px; color: #228b22; margin-bottom: 8px; font-weight: 600;">Ваш код подтверждения:</p>
              <h3 style="font-size: 32px; font-weight: bold; color: #228b22; margin: 0; background-color: #e4e4e7; padding: 10px 15px; border-radius: 8px; display: inline-block;">
                ${code}
              </h3>
              <p style="font-size: 12px; margin-top: 12px; color: #228b22;">Этот код действителен в течение 15 минут.</p>
            </div>

            <p style="margin-top: 20px; margin-bottom: 16px; font-size: 14px; color: #666;">
              Или вы можете нажать на кнопку ниже:
            </p>

            <a href="${verificationLink}" target="_blank" style="display: inline-block; background-color: #a3e635; color: #1a1a1a; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
              Подтвердить Email
            </a>

            <p style="font-size: 12px; color: #737373; margin-top: 16px;">
              Если вы не регистрировались в ECHO, просто проигнорируйте это письмо.
            </p>
            <p style="font-size: 14px; margin-top: 20px; color: #666;">
              С уважением,<br/> Команда ECHO
            </p>
          </div>
        `,
      });
      console.log(`Verification email sent to ${to}`);
    } catch (error) {
      console.error(`Failed to send verification email to ${to}:`, error);
      throw new InternalServerErrorException('Не удалось отправить письмо с кодом подтверждения.');
    }
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `ECHO App <${this.senderEmail}>`,
        to: to,
        subject: 'ECHO: Код для сброса пароля',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #fff; padding: 20px; border-radius: 12px; max-width: 600px; margin: 20px auto; border: 1px solid #e4e4e7;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <img src="${this.appUrl}/echo-logo.png" alt="ECHO Logo" style="width: 40px; height: 40px; border-radius: 50%;">
              <h1 style="font-size: 24px; font-weight: bold; color: #181818;">ECHO</h1>
            </div>
            <h2 style="font-size: 28px; font-weight: bold; margin-bottom: 12px; color: #181818;">Запрос на сброс пароля</h2>
            <p style="margin-bottom: 16px; color: #333;">Вы получили это письмо, потому что запросили сброс пароля для вашего аккаунта ECHO.</p>
            
            <div style="background-color: #f4f4f5; padding: 15px 20px; border-radius: 10px; display: inline-block; border: 1px dashed #e4e4e7;">
              <p style="font-size: 14px; color: #228b22; margin-bottom: 8px; font-weight: 600;">Ваш код для сброса пароля:</p>
              <h3 style="font-size: 32px; font-weight: bold; color: #228b22; margin: 0; background-color: #e4e4e7; padding: 10px 15px; border-radius: 8px; display: inline-block;">
                ${code}
              </h3>
              <p style="font-size: 12px; margin-top: 12px; color: #228b22;">Этот код действителен в течение 30 минут.</p>
            </div>

            <p style="font-size: 12px; color: #737373; margin-top: 16px;">
              Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
            </p>
            <p style="font-size: 14px; margin-top: 20px; color: #666;">
              С уважением,<br/> Команда ECHO
            </p>
          </div>
        `,
      });
      console.log(`Password reset email sent to ${to}`);
    } catch (error) {
      console.error(`Failed to send password reset email to ${to}:`, error);
      throw new InternalServerErrorException('Не удалось отправить письмо с кодом для сброса пароля.');
    }
  }
}