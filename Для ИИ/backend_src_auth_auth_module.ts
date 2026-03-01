// backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../email/email.module';
import { EventsModule } from '../events/events.module'; // 1. Импортируем EventsModule

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      // Секрет JWT берём из окружения, жёстко не хардкодим.
      secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
      signOptions: { expiresIn: '7d' },
    }),
    EmailModule,
    EventsModule, // 2. Добавляем EventsModule в imports
  ],
  providers: [
    AuthService,
    AuthResolver,
    JwtStrategy,
    JwtAuthGuard,
    PrismaService,
  ],
  exports: [JwtAuthGuard, PrismaService],
})
export class AuthModule {}