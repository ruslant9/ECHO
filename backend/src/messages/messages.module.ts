import { Module, forwardRef } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesResolver } from './messages.resolver';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => EventsModule), 
    NotificationsModule
  ],
  providers: [MessagesResolver, MessagesService, PrismaService],
  exports: [MessagesService],
})
export class MessagesModule {}