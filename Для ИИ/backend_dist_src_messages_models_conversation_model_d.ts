import { User } from '../../users/models/user.model';
import { Message } from './message.model';
import { ConversationType } from '@prisma/client';
export declare class Conversation {
    id: number;
    participant: User;
    title?: string;
    avatar?: string;
    isAnonymous?: boolean;
    viewsCount?: number;
    isGroup: boolean;
    type: ConversationType;
    description?: string;
    slug?: string;
    myRole?: string;
    hasLeft: boolean;
    participantsCount: number;
    lastMessage?: Message;
    unreadCount: number;
    isArchived: boolean;
    isManuallyUnread: boolean;
    isPinned: boolean;
    pinOrder?: number;
    mutedUntil?: Date;
    updatedAt: Date;
}
