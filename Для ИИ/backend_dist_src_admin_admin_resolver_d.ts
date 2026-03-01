import { AdminService } from './admin.service';
export declare class AdminResolver {
    private readonly adminService;
    constructor(adminService: AdminService);
    serverStats(): Promise<{
        totalUsers: number;
        onlineUsers: number;
        totalPosts: number;
        totalLikes: number;
        totalComments: number;
        totalMessages: number;
        storageStats: any[];
    }>;
    startServer(): Promise<boolean>;
    stopServer(): Promise<boolean>;
    restartServer(): Promise<boolean>;
}
