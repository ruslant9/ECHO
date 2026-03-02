import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
export declare class MusicImportService {
    private prisma;
    private eventsGateway;
    private client;
    private queue;
    private isProcessing;
    private currentArtist;
    private TEMP_DIR;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    private broadcastStatus;
    private getOrCreateArtist;
    addToQueue(queries: string[]): Promise<void>;
    private processQueue;
    private importArtistLogic;
    private downloadAndUpload;
    getQueueStatus(): {
        queue: string[];
        isProcessing: boolean;
        currentArtist: string;
    };
    clearQueue(): void;
}
