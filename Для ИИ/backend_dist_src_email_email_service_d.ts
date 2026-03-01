import 'dotenv/config';
import { PrismaService } from '../prisma.service';
export declare class EmailService {
    private prisma;
    private transporter;
    private readonly senderEmail;
    private readonly appUrl;
    constructor(prisma: PrismaService);
    private generateVerificationLink;
    sendVerificationCode(to: string, code: string, userId: number): Promise<void>;
    sendPasswordResetCode(to: string, code: string): Promise<void>;
}
