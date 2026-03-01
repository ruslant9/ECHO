import { AuthService } from './auth.service';
import { LoginResponse } from './dto/login-response';
import { LoginUserInput } from './dto/login-user.input';
import { RegisterUserInput } from './dto/register-user.input';
import { ConfirmEmailInput } from './dto/confirm-email.input';
import { RequestPasswordResetInput } from './dto/request-password-reset.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { ChangePasswordInput } from './dto/change-password.input';
export declare class AuthResolver {
    private authService;
    constructor(authService: AuthService);
    login(loginUserInput: LoginUserInput, context: any): Promise<LoginResponse>;
    register(registerUserInput: RegisterUserInput): Promise<LoginResponse>;
    confirmEmail(confirmEmailInput: ConfirmEmailInput): Promise<LoginResponse>;
    requestPasswordReset(requestPasswordResetInput: RequestPasswordResetInput): Promise<LoginResponse>;
    resetPassword(resetPasswordInput: ResetPasswordInput): Promise<boolean>;
    changePassword(input: ChangePasswordInput, context: any): Promise<boolean>;
}
