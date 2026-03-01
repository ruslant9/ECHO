import { User } from '../../users/models/user.model';
export declare class LoginResponse {
    access_token?: string;
    user?: User;
    emailSent?: boolean;
    userId?: number;
}
