import { NotificationsService } from './notifications.service';
export declare class NotificationsResolver {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    myNotifications(context: any): Promise<({
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
    markNotificationsRead(context: any, ids: number[]): Promise<boolean>;
    deleteFriendRequestNotification(context: any, initiatorId: number): Promise<boolean>;
    deleteNotification(context: any, id: number): Promise<boolean>;
    clearAllNotifications(context: any): Promise<boolean>;
}
