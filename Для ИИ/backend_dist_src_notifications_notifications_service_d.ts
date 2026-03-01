import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
export declare class NotificationsService {
    private prisma;
    private eventsGateway;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    create(userId: number, type: string, message: string, initiatorId?: number, postId?: number, commentId?: number, postContentSnippet?: string, commentContentSnippet?: string, imageUrl?: string, conversationId?: number, conversationTitle?: string, conversationAvatar?: string | null, vibeId?: number, vibeCommentId?: number): Promise<{
        initiator: {
            id: number;
            email: string;
            username: string;
            name: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
    } & {
        id: number;
        createdAt: Date;
        vibeId: number | null;
        postId: number | null;
        userId: number;
        type: string;
        conversationId: number | null;
        message: string;
        commentId: number | null;
        vibeCommentId: number | null;
        initiatorId: number | null;
        isRead: boolean;
        imageUrl: string | null;
    }>;
    deleteFriendRequestNotification(userId: number, initiatorId: number): Promise<boolean>;
    deleteFriendAcceptNotification(userId: number, initiatorId: number): Promise<boolean>;
    deleteLikeNotification(userId: number, initiatorId: number, postId: number, commentId?: number): Promise<boolean>;
    deleteVibeLikeNotification(userId: number, initiatorId: number, vibeId: number): Promise<boolean>;
    findAll(userId: number): Promise<({
        initiator: {
            id: number;
            email: string;
            username: string;
            name: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
    } & {
        id: number;
        createdAt: Date;
        vibeId: number | null;
        postId: number | null;
        userId: number;
        type: string;
        conversationId: number | null;
        message: string;
        commentId: number | null;
        vibeCommentId: number | null;
        initiatorId: number | null;
        isRead: boolean;
        imageUrl: string | null;
    })[]>;
    markAsRead(ids: number[], userId: number): Promise<boolean>;
    remove(id: number, userId: number): Promise<boolean>;
    clearAll(userId: number): Promise<boolean>;
}
