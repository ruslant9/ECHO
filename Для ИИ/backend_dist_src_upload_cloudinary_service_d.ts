export declare class CloudinaryService {
    private readonly logger;
    private accounts;
    private currentIndex;
    constructor();
    getStorageStats(): Promise<any[]>;
    private getAvailableAccount;
    uploadImage(filePath: string, folder: string): Promise<string>;
    deleteFileByUrl(url: string): Promise<void>;
    uploadMedia(filePath: string, folder: string, resourceType: 'video' | 'raw' | 'auto', options?: {
        startOffset?: number;
        endOffset?: number;
    }): Promise<string>;
}
