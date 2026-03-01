// backend/src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CommentsService } from './comments.service';
import { PostsResolver } from './posts.resolver';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [
    PostsResolver, 
    PostsService, 
    CommentsService, // CommentsService уже объявлен как провайдер
    PrismaService
  ],
})
export class PostsModule {}