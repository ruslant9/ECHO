import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { User } from '@prisma/client';
export declare class UsersService {
    private prisma;
    private eventsGateway;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    findOne(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    create(data: any): Promise<User>;
    terminateAllOtherSessions(userId: number, currentToken: string): Promise<boolean>;
    deleteAccount(userId: number, passwordAttempt: string): Promise<boolean>;
    setOnlineStatus(userId: number, isOnline: boolean): Promise<{
        id: number;
        email: string;
        username: string;
        name: string | null;
        password: string;
        isOnline: boolean;
        lastOnlineAt: Date | null;
        isAdmin: boolean;
        isVerified: boolean;
        createdAt: Date;
        bio: string | null;
        location: string | null;
        gender: string | null;
        website: string | null;
        avatar: string | null;
        banner: string | null;
    }>;
    blockUser(userId: number, targetId: number): Promise<boolean>;
    unblockUser(userId: number, targetId: number): Promise<boolean>;
    isBlocked(blockerId: number, targetId: number): Promise<boolean>;
}
