import { Module } from '@nestjs/common';
import { VibesResolver } from './vibes.resolver';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module'; // <--- ДОБАВИТЬ

@Module({
  imports: [NotificationsModule], // <--- ДОБАВИТЬ
  providers: [VibesResolver, PrismaService],
})
export class VibesModule {}