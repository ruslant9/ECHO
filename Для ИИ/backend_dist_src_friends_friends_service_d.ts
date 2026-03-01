import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
export declare class FriendsService {
    private prisma;
    private notificationsService;
    private eventsGateway;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, eventsGateway: EventsGateway);
    sendRequest(userId: number, targetId: number): Promise<{
        id: number;
        createdAt: Date;
        senderId: number;
        receiverId: number;
        status: import(".prisma/client").$Enums.RequestStatus;
    }>;
    acceptRequest(userId: number, requestId: number): Promise<[{
        id: number;
        createdAt: Date;
        senderId: number;
        receiverId: number;
        status: import(".prisma/client").$Enums.RequestStatus;
    }, {
        id: number;
        createdAt: Date;
        userId: number;
        score: number;
        friendId: number;
    }, {
        id: number;
        createdAt: Date;
        userId: number;
        score: number;
        friendId: number;
    }]>;
    rejectRequest(userId: number, requestId: number): Promise<{
        id: number;
        createdAt: Date;
        senderId: number;
        receiverId: number;
        status: import(".prisma/client").$Enums.RequestStatus;
    }>;
    removeFriend(userId: number, friendId: number): Promise<boolean>;
    getMyFriends(userId: number): Promise<({
        friend: {
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
        userId: number;
        score: number;
        friendId: number;
    })[]>;
    getIncomingRequests(userId: number): Promise<({
        sender: {
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
        senderId: number;
        receiverId: number;
        status: import(".prisma/client").$Enums.RequestStatus;
    })[]>;
    searchUsers(userId: number, query?: string, city?: string, gender?: string, registeredAfter?: string): Promise<{
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
    }[]>;
    cancelRequest(userId: number, requestId: number): Promise<{
        id: number;
        createdAt: Date;
        senderId: number;
        receiverId: number;
        status: import(".prisma/client").$Enums.RequestStatus;
    }>;
    getOutgoingRequests(userId: number): Promise<({
        receiver: {
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
        senderId: number;
        receiverId: number;
        status: import(".prisma/client").$Enums.RequestStatus;
    })[]>;
}
