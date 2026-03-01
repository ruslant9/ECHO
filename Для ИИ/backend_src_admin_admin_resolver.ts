import { Resolver, Query, Mutation, ObjectType, Field, Int, Float } from '@nestjs/graphql'; 
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

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
  constructor(private readonly adminService: AdminService) {}

  @Query(() => ServerStats)
  async serverStats() {
    return this.adminService.getStats();
  }
  
  // ВАЖНО: Функции ниже для демонстрации. В продакшене используйте
  // более безопасные способы управления сервером, а не прямые shell-команды.
  // Они требуют, чтобы ваше приложение было запущено через PM2.
  
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