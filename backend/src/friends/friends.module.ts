// backend/src/friends/friends.module.ts

import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsResolver } from './friends.resolver';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module'; // <--- 1. Импорт

@Module({
  imports: [
    EventsModule, // <--- 2. Добавьте сюда
  ],
  providers: [FriendsResolver, FriendsService, PrismaService],
})
export class FriendsModule {}