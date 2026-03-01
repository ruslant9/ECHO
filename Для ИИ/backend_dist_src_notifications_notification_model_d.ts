import { User } from '../users/models/user.model';
export declare class Notification {
    id: number;
    type: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    initiator?: User;
    postId?: number;
    commentId?: number;
    imageUrl?: string;
    vibeId?: number;
    vibeCommentId?: number;
}
