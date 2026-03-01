import { Conversation } from './conversation.model';
import { User } from '../../users/models/user.model';
export declare class InviteLink {
    id: number;
    code: string;
    conversationId: number;
    conversation: Conversation;
    creatorId: number;
    creator: User;
    createdAt: Date;
    expiresAt?: Date;
    usageLimit?: number;
    usedCount: number;
}
