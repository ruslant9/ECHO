import { User } from '../../users/models/user.model';
export declare class MessageReaction {
    id: number;
    emoji: string;
    userId: number;
    user: User;
}
export declare class ReplyContext {
    id: number;
    content: string;
    images?: string[];
    sender: User;
}
export declare class SystemMessageMention {
    userId: number;
    name: string;
}
export declare class MessageReadBy {
    user: User;
    readAt: Date;
}
export declare class Message {
    id: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    editedAt?: Date | null;
    senderId: number;
    images?: string[];
    conversationId: number;
    sender: User;
    isRead: boolean;
    isPinned: boolean;
    type: string;
    systemMessageMentions?: SystemMessageMention[];
    isAnonymous?: boolean;
    viewsCount?: number;
    forwardedFrom?: User;
    replyTo?: ReplyContext;
    reactions?: MessageReaction[];
    readBy?: MessageReadBy[];
}
