export declare class CloudinaryService {
    private readonly logger;
    private accounts;
    private currentIndex;
    constructor();
    getStorageStats(): Promise<any[]>;
    private getAvailableAccount;
    uploadImage(filePath: string, folder: string): Promise<string>;
    uploadMedia(filePath: string, folder: string, resourceType: 'video' | 'raw' | 'auto'): Promise<string>;
}
