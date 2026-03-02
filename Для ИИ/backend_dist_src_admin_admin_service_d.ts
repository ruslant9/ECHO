import { PrismaService } from '../prisma.service';
import { CloudinaryService } from '../upload/cloudinary.service';
export declare class AdminService {
    private prisma;
    private cloudinaryService;
    constructor(prisma: PrismaService, cloudinaryService: CloudinaryService);
    getStats(): Promise<{
        totalUsers: number;
        onlineUsers: number;
        totalPosts: number;
        totalLikes: number;
        totalComments: number;
        totalMessages: number;
        storageStats: any[];
        totalStorageUsage: any;
        totalStorageLimit: any;
    }>;
    controlServer(action: 'start' | 'stop' | 'restart'): Promise<boolean>;
}
