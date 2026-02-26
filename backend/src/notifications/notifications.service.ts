import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';

// --- ОБЩИЙ ОБЪЕКТ SELECT ДЛЯ ПОЛЕЙ ПОЛЬЗОВАТЕЛЯ ---
const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  isOnline: true,
  lastOnlineAt: true,
  isVerified: true,
  createdAt: true,
  bio: true,
  location: true,
  gender: true,
  website: true,
  avatar: true,
  banner: true,
  isAdmin: true, // Обязательно включаем isAdmin
};
// ----------------------------------------------------

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(
    userId: number,
    type: string,
    message: string,
    initiatorId?: number,
    postId?: number,
    commentId?: number,
    postContentSnippet?: string,
    commentContentSnippet?: string,
    imageUrl?: string,
    conversationId?: number,
    conversationTitle?: string,
    conversationAvatar?: string | null,
    vibeId?: number,
    vibeCommentId?: number
  ) {
    // 1. Проверка настроек уведомлений
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    // Если глобально отключены до определенного времени
    if (settings?.muteAllUntil && new Date() < new Date(settings.muteAllUntil)) {
      return; 
    }
    
    // Проверяем индивидуальные типы уведомлений
    if (
      (type.includes('LIKE') && settings?.notifyOnLikes === false) || // POST_LIKE, COMMENT_LIKE, VIBE_LIKE
      (type.includes('COMMENT') && settings?.notifyOnComments === false) || // NEW_COMMENT, NEW_VIBE_COMMENT
      (type.includes('REPOST') && settings?.notifyOnReposts === false) || // REPOST, VIBE_REPOST
      (type.includes('FRIEND') && settings?.notifyOnFriendRequests === false) // FRIEND_REQUEST, FRIEND_ACCEPT
    ) {
      return; 
    }

    // 2. Дедупликация для FRIEND_REQUEST
    if (type === 'FRIEND_REQUEST' && initiatorId !== undefined && initiatorId !== null) {
      const existingFriendRequestNotification = await this.prisma.notification.findFirst({
        where: { userId, type: 'FRIEND_REQUEST', initiatorId },
      });

      if (existingFriendRequestNotification) {
        const updatedNotification = await this.prisma.notification.update({
          where: { id: existingFriendRequestNotification.id },
          data: { message, createdAt: new Date(), isRead: false, imageUrl },
          include: { initiator: { select: userSelect } },
        });
        this.eventsGateway.sendNotificationToUser(userId, updatedNotification);
        return updatedNotification;
      }
    }
    
    // 3. Дедупликация для лайков постов и репостов постов
    if (['POST_LIKE', 'COMMENT_LIKE'].includes(type) && initiatorId && postId) {
        const existingLikeNotification = await this.prisma.notification.findFirst({
            where: { userId, type, initiatorId, postId, commentId, isRead: false }
        });
        if (existingLikeNotification) {
            const updated = await this.prisma.notification.update({
                where: { id: existingLikeNotification.id },
                data: { createdAt: new Date(), message, imageUrl },
                include: { initiator: { select: userSelect } }
            });
            this.eventsGateway.sendNotificationToUser(userId, updated);
            return updated;
        }
    }

    if (type === 'REPOST' && initiatorId && postId) {
        const existingRepostNotification = await this.prisma.notification.findFirst({
            where: { userId, type, initiatorId, postId, isRead: false }
        });
        if (existingRepostNotification) {
            const updated = await this.prisma.notification.update({
                where: { id: existingRepostNotification.id },
                data: { createdAt: new Date(), message, imageUrl },
                include: { initiator: { select: userSelect } }
            });
            this.eventsGateway.sendNotificationToUser(userId, updated);
            return updated;
        }
    }

    // 4. Дедупликация для Вайбов (VIBE_LIKE, VIBE_REPOST)
    if (['VIBE_LIKE', 'VIBE_REPOST'].includes(type) && initiatorId && vibeId) {
        const existingVibeNotification = await this.prisma.notification.findFirst({
            where: { userId, type, initiatorId, vibeId, isRead: false }
        });
        if (existingVibeNotification) {
            const updated = await this.prisma.notification.update({
                where: { id: existingVibeNotification.id },
                data: { createdAt: new Date(), message }, // imageUrl для вайбов обычно не нужен, т.к. это видео
                include: { initiator: { select: userSelect } }
            });
            this.eventsGateway.sendNotificationToUser(userId, updated);
            return updated;
        }
    }

    // 5. Создание уведомления
    const newNotification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        message,
        initiatorId,
        postId,
        commentId,
        imageUrl,
        conversationId,
        vibeId,
        vibeCommentId,
      } as any,
      include: { initiator: { select: userSelect } },
    });

    const payload: any = { ...newNotification };
    if (type === 'NEW_MESSAGE' && conversationId && (conversationTitle != null || conversationAvatar != null)) {
      payload.conversationTitle = conversationTitle ?? 'Беседа';
      payload.conversationAvatar = conversationAvatar ?? null;
    }
    this.eventsGateway.sendNotificationToUser(userId, payload);
    return newNotification;
  }

  async deleteFriendRequestNotification(userId: number, initiatorId: number): Promise<boolean> {
    await this.prisma.notification.deleteMany({
      where: {
        userId,
        initiatorId,
        type: 'FRIEND_REQUEST',
      },
    });
    return true;
  }

  async deleteFriendAcceptNotification(userId: number, initiatorId: number): Promise<boolean> {
      await this.prisma.notification.deleteMany({
          where: {
              userId,
              initiatorId,
              type: 'FRIEND_ACCEPT'
          }
      });
      return true;
  }

  async deleteLikeNotification(userId: number, initiatorId: number, postId: number, commentId?: number): Promise<boolean> {
      await this.prisma.notification.deleteMany({
          where: {
              userId,
              initiatorId,
              postId,
              commentId,
              OR: [{ type: 'POST_LIKE' }, { type: 'COMMENT_LIKE' }]
          }
      });
      return true;
  }

  async deleteVibeLikeNotification(userId: number, initiatorId: number, vibeId: number): Promise<boolean> {
      await this.prisma.notification.deleteMany({
          where: {
              userId,
              initiatorId,
              vibeId,
              type: 'VIBE_LIKE'
          }
      });
      return true;
  }
  
  async findAll(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      include: { initiator: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  async markAsRead(ids: number[], userId: number) {
    await this.prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { isRead: true },
    });
    this.eventsGateway.server.to(`user_${userId}`).emit('notification_count_updated');
    return true;
  }

  async remove(id: number, userId: number): Promise<boolean> {
    await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    return true;
  }

  async clearAll(userId: number): Promise<boolean> {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return true;
  }
}