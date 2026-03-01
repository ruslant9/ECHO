import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
export declare class TasksService {
    private prisma;
    private eventsGateway;
    private notificationsService;
    private readonly logger;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway, notificationsService: NotificationsService);
    handleScheduledPosts(): Promise<void>;
    private getPostContentSnippet;
}
