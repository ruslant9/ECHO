import { AdminService } from './admin.service';
import { MusicImportService } from '../music/music-import.service';
export declare class AdminResolver {
    private readonly adminService;
    private readonly musicImportService;
    constructor(adminService: AdminService, musicImportService: MusicImportService);
    serverStats(): Promise<{
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
    startMusicImport(artistName: string): Promise<boolean>;
    clearImportQueue(): Promise<boolean>;
    startServer(): Promise<boolean>;
    stopServer(): Promise<boolean>;
    restartServer(): Promise<boolean>;
}
