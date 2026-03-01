import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class VibesResolver {
    private prisma;
    private notificationsService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    createVibe(ctx: any, videoUrl: string, description: string, hashtags: string[], isPrivate: boolean): Promise<number>;
    repostVibe(ctx: any, vibeId: number): Promise<boolean>;
    deleteVibe(ctx: any, vibeId: number): Promise<boolean>;
    getVibeLikes(ctx: any, vibeId: number): Promise<{
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
    }[]>;
    vibe(ctx: any, id: number): Promise<{
        isLikedByUser: boolean;
        author: {
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
        };
        likes: {
            createdAt: Date;
            vibeId: number;
            userId: number;
        }[];
        id: number;
        createdAt: Date;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        description: string | null;
        viewsCount: number;
        videoUrl: string;
        hashtags: string[];
        isPrivate: boolean;
    }>;
    incrementVibeViews(vibeId: number): Promise<boolean>;
    getVibeReposters(ctx: any, vibeId: number): Promise<any[]>;
    getVibesFeed(ctx: any, feedType: string): Promise<{
        isLikedByUser: boolean;
        author: {
            id: number;
            username: string;
            name: string;
            avatar: string;
        };
        likes: {
            createdAt: Date;
            vibeId: number;
            userId: number;
        }[];
        id: number;
        createdAt: Date;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        description: string | null;
        viewsCount: number;
        videoUrl: string;
        hashtags: string[];
        isPrivate: boolean;
    }[]>;
    toggleVibeLike(ctx: any, vibeId: number): Promise<boolean>;
    getVibeComments(vibeId: number): Promise<({
        author: {
            id: number;
            username: string;
            name: string;
            avatar: string;
        };
    } & {
        id: number;
        createdAt: Date;
        content: string;
        authorId: number;
        vibeId: number;
    })[]>;
    deleteVibeComment(ctx: any, commentId: number): Promise<boolean>;
    addVibeComment(ctx: any, vibeId: number, content: string): Promise<boolean>;
}
