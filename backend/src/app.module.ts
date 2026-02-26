import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppResolver } from './app.resolver';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { PrismaService } from './prisma.service';
import { FriendsModule } from './friends/friends.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';
import { MessagesModule } from './messages/messages.module';
import { EmailModule } from './email/email.module';
import { TasksModule } from './tasks/tasks.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { VibesModule } from './vibes/vibes.module';
// 1. Импортируем модуль музыки
import { MusicModule } from './music/music.module'; 

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    AuthModule,
    UsersModule,
    EventsModule,
    FriendsModule,
    NotificationsModule,
    PostsModule,
    MessagesModule,
    EmailModule,
    TasksModule,
    AdminModule,
    UploadModule,
    VibesModule,
    // 2. Добавляем его сюда
    MusicModule, 
  ],
  providers: [AppResolver, PrismaService],
})
export class AppModule {}