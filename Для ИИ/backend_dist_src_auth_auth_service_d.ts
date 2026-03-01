import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { User as PrismaUser } from '@prisma/client';
import { ChangePasswordInput } from './dto/change-password.input';
import { EventsGateway } from '../events/events.gateway';
export declare class AuthService {
    private usersService;
    private jwtService;
    private prisma;
    private emailService;
    private eventsGateway;
    constructor(usersService: UsersService, jwtService: JwtService, prisma: PrismaService, emailService: EmailService, eventsGateway: EventsGateway);
    private generateCode;
    login(user: any, ip?: string, userAgent?: string): Promise<{
        access_token: string;
        user: any;
    }>;
    changePassword(userId: number, input: ChangePasswordInput): Promise<boolean>;
    private validatePasswordStrength;
    sendVerificationCodeAndResponse(user: PrismaUser): Promise<{
        emailSent: boolean;
        userId: number;
    }>;
    validateUser(email: string, pass: string): Promise<any>;
    register(data: any): Promise<{
        emailSent: boolean;
        userId: number;
    } | {
        access_token: string;
        user: any;
    }>;
    confirmEmail(userId: number, code: string): Promise<{
        access_token: string;
        user: any;
    }>;
    requestPasswordReset(email: string): Promise<{
        emailSent: boolean;
    }>;
    resetPassword(email: string, code: string, newPasswordPlain: string): Promise<{
        success: boolean;
    }>;
}
