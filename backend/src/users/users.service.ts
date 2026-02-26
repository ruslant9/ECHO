import { Injectable, Inject, forwardRef, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway'; // <-- импорт
import { User } from '@prisma/client';
import { Prisma } from '@prisma/client'; 
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway
    // -----------------------
  ) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: any): Promise<User> {
    return this.prisma.user.create({ data });
  }

   async terminateAllOtherSessions(userId: number, currentToken: string) {
    await this.prisma.session.deleteMany({
      where: {
        userId: userId,
        token: { not: currentToken }, 
      },
    });
    return true;
  }

  async deleteAccount(userId: number, passwordAttempt: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const isPasswordValid = await bcrypt.compare(passwordAttempt, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный пароль');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return true;
  }

  async setOnlineStatus(userId: number, isOnline: boolean) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          isOnline,
          lastOnlineAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null; 
      }
      throw error;
    }
  }

  async blockUser(userId: number, targetId: number) {
    if (userId === targetId) throw new ConflictException('Нельзя заблокировать себя');

    await this.prisma.block.create({
      data: {
        blockerId: userId,
        blockedId: targetId,
      },
    });

    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId: userId, friendId: targetId },
          { userId: targetId, friendId: userId },
        ],
      },
    });

    await this.prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: targetId },
          { senderId: targetId, receiverId: userId },
        ],
      },
    });

    // Отправка сокет-события
    this.eventsGateway.server.to(`user_${userId}`).emit('profile_update_required', { targetId });
    this.eventsGateway.server.to(`user_${targetId}`).emit('profile_update_required', { targetId: userId });
    
    return true;
  }

  async unblockUser(userId: number, targetId: number) {
    await this.prisma.block.deleteMany({
      where: {
        blockerId: userId,
        blockedId: targetId,
      },
    });

    // Отправка сокет-события
    this.eventsGateway.server.to(`user_${userId}`).emit('profile_update_required', { targetId });
    this.eventsGateway.server.to(`user_${targetId}`).emit('profile_update_required', { targetId: userId });
    
    return true;
  }

  async isBlocked(blockerId: number, targetId: number): Promise<boolean> {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: targetId
        }
      }
    });
    return !!block;
  }
}