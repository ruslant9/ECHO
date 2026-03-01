// backend/src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { UsersResolver } from './users.resolver';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    forwardRef(() => EventsModule), // <--- ОБЕРНУЛИ
  ],
  providers: [UsersService, PrismaService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}