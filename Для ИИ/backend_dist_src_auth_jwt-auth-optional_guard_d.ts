import { ExecutionContext } from '@nestjs/common';
declare const JwtAuthGuardOptional_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuardOptional extends JwtAuthGuardOptional_base {
    getRequest(context: ExecutionContext): any;
    handleRequest(err: any, user: any, info: any): any;
}
export {};
