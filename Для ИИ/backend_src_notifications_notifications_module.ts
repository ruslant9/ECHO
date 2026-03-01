import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module'; // Для доступа к Gateway

@Global() // Делаем глобальным, чтобы использовать сервис в FriendsModule
@Module({
  imports: [EventsModule],
  providers: [NotificationsResolver, NotificationsService, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}