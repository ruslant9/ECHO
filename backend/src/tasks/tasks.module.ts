// backend/src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Регистрация ScheduleModule для корневого модуля
    EventsModule, // Нужен для EventsGateway
    NotificationsModule, // Нужен для NotificationsService
  ],
  providers: [TasksService, PrismaService], // PrismaService нужен TasksService
})
export class TasksModule {}