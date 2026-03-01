import { FriendsService } from './friends.service';
export declare class FriendsResolver {
    private readonly friendsService;
    constructor(friendsService: FriendsService);
    outgoingRequests(context: any): Promise<({
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
    cancelFriendRequest(context: any, requestId: number): Promise<boolean>;
    myFriends(context: any): Promise<({
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
    incomingRequests(context: any): Promise<({
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
    searchUsers(context: any, query?: string, city?: string, gender?: string, registeredAfter?: string): Promise<{
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
    sendFriendRequest(context: any, targetId: number): Promise<boolean>;
    acceptFriendRequest(context: any, requestId: number): Promise<boolean>;
    rejectFriendRequest(context: any, requestId: number): Promise<boolean>;
    removeFriend(context: any, friendId: number): Promise<boolean>;
}
