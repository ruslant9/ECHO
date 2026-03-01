import { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    private prisma;
    constructor(prisma: PrismaService);
    getRequest(context: ExecutionContext): any;
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractToken;
}
export {};
