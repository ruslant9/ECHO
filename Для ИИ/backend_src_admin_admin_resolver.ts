import { Resolver, Query, Mutation, ObjectType, Field, Int, Float, Args } from '@nestjs/graphql'; // Добавили Args
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { MusicImportService } from '../music/music-import.service'; // Добавили импорт сервиса

@ObjectType()
class ServerStats {
  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  onlineUsers: number;

  @Field(() => Int)
  totalPosts: number;

  @Field(() => Int)
  totalLikes: number;

  @Field(() => Int)
  totalComments: number;

  @Field(() => Int)
  totalMessages: number;
  
  @Field(() => Float)
  totalStorageUsage: number;

  @Field(() => Float)
  totalStorageLimit: number;

  @Field(() => [CloudinaryStat])
  storageStats: CloudinaryStat[];
}



@ObjectType()
class CloudinaryStat {
  @Field()
  cloudName: string;

  @Field(() => Float)
  usage: number;

  @Field(() => Float)
  limit: number;

  @Field(() => Float)
  percentage: number;

  @Field()
  isFull: boolean;
}

@Resolver()
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminResolver {
  constructor(
    private readonly adminService: AdminService,
    private readonly musicImportService: MusicImportService, // Инжектировали сервис сюда
  ) {}

  @Query(() => ServerStats)
  async serverStats() {
    return this.adminService.getStats();
  }

   @Mutation(() => Boolean)
  async startMusicImport(@Args('artistName') artistName: string) {
    // Разбиваем строку по запятой, если пользователь ввел список
    const artists = artistName.split(',').map(a => a.trim()).filter(a => a);
    await this.musicImportService.addToQueue(artists);
    return true;
  }

  @Mutation(() => Boolean)
  async clearImportQueue() {
    this.musicImportService.clearQueue();
    return true;
  }
  
  @Mutation(() => Boolean)
  async startServer(): Promise<boolean> {
    return this.adminService.controlServer('start');
  }

  @Mutation(() => Boolean)
  async stopServer(): Promise<boolean> {
    return this.adminService.controlServer('stop');
  }
  
  @Mutation(() => Boolean)
  async restartServer(): Promise<boolean> {
    return this.adminService.controlServer('restart');
  }
}