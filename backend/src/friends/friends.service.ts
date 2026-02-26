
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
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
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private eventsGateway: EventsGateway
  ) {}

  // Отправить заявку
  async sendRequest(userId: number, targetId: number) {
    if (userId === targetId) throw new ConflictException("Нельзя добавить себя");

    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetId },
          { senderId: targetId, receiverId: userId },
        ],
      },
    });

    if (existing) throw new ConflictException("Заявка уже существует или вы уже друзья");

    // Проверяем, не друзья ли уже
    const friends = await this.prisma.friendship.findFirst({
        where: { userId, friendId: targetId }
    });
    if (friends) throw new ConflictException("Вы уже друзья");

    // 1. Создаем заявку
    const request = await this.prisma.friendRequest.create({
      data: { senderId: userId, receiverId: targetId },
    });

    // 2. ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ ПОЛУЧАТЕЛЮ
    // Тип: FRIEND_REQUEST
    await this.notificationsService.create(
      targetId,
      'FRIEND_REQUEST',
      'Вам отправлена заявка в друзья',
      userId // initiatorId (кто отправил)
    );

    return request;
  }

   async acceptRequest(userId: number, requestId: number) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request || request.receiverId !== userId) {
      throw new NotFoundException("Заявка не найдена");
    }

    const result = await this.prisma.$transaction([
      this.prisma.friendRequest.delete({ where: { id: requestId } }),
      this.prisma.friendship.create({ data: { userId: request.receiverId, friendId: request.senderId, score: 0 } }),
      this.prisma.friendship.create({ data: { userId: request.senderId, friendId: request.receiverId, score: 0 } }),
    ]);

    // 1. УДАЛЯЕМ УВЕДОМЛЕНИЕ О ЗАЯВКЕ У ПОЛУЧАТЕЛЯ (у себя)
    await this.notificationsService.deleteFriendRequestNotification(userId, request.senderId);

    // 2. Создаем уведомление отправителю о принятии
    await this.notificationsService.create(
      request.senderId,
      'FRIEND_ACCEPT',
      'Ваша заявка в друзья принята',
      userId
    );

    // 3. Отправляем события WebSocket
    this.eventsGateway.server.to(`user_${request.senderId}`).emit('friendship_update');
    this.eventsGateway.server.to(`user_${userId}`).emit('notification_update');

    return result;
  }

  // Отклонить заявку
  async rejectRequest(userId: number, requestId: number) {
     const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
     if (!request || request.receiverId !== userId) throw new NotFoundException("Нет прав");
     
     const result = await this.prisma.friendRequest.delete({ where: { id: requestId } });

     // 1. УДАЛЯЕМ УВЕДОМЛЕНИЕ О ЗАЯВКЕ У ПОЛУЧАТЕЛЯ (у себя)
     await this.notificationsService.deleteFriendRequestNotification(userId, request.senderId);

     // 2. Отправляем события WebSocket
     this.eventsGateway.server.to(`user_${request.senderId}`).emit('friendship_update');
     this.eventsGateway.server.to(`user_${userId}`).emit('notification_update');

     return result;
  }

  // Удалить друга
  async removeFriend(userId: number, friendId: number) {
    // Используем транзакцию, чтобы оба действия выполнились одновременно
    await this.prisma.$transaction(async (tx) => {
      // 1. Удаляем запись о дружбе (в обе стороны)
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId: userId, friendId: friendId },
            { userId: friendId, friendId: userId }
          ]
        }
      });
      
      // --- НОВОЕ: Удаляем уведомление о принятии дружбы у того, кто удаляет ---
      // (userId был получателем уведомления, friendId был инициатором, т.е. принявшим)
      await this.notificationsService.deleteFriendAcceptNotification(userId, friendId);

      // --- НОВОЕ: Удаляем уведомление о принятии дружбы у удаляемого друга ---
      // (friendId был получателем уведомления, userId был инициатором)
      await this.notificationsService.deleteFriendAcceptNotification(friendId, userId);


      // 2. Создаем заявку в друзья:
      // Sender (Отправитель) = friendId (Тот, кого удалили)
      // Receiver (Получатель) = userId (Вы)
      // Таким образом, он появится у вас во "Входящих"
      await tx.friendRequest.create({
        data: {
          senderId: friendId,
          receiverId: userId,
        }
      });
    });

    // 3. Обновляем списки через сокеты
    this.eventsGateway.server.to(`user_${friendId}`).emit('friendship_update');
    this.eventsGateway.server.to(`user_${friendId}`).emit('notification_update'); // У друга тоже обновится

    this.eventsGateway.server.to(`user_${userId}`).emit('friendship_update');
    this.eventsGateway.server.to(`user_${userId}`).emit('notification_update'); // У себя тоже обновится

    return true;
  }

  // Получить моих друзей (с сортировкой по Score для Топ-5)
   async getMyFriends(userId: number) {
    try {
      return await this.prisma.friendship.findMany({
        where: { userId },
        include: { friend: { select: userSelect } }, // ИСПРАВЛЕНО
        orderBy: { score: 'desc' },
      });
    } catch (error) {
      console.error(`Ошибка в getMyFriends для пользователя ${userId}:`, error);
      throw error; 
    }
  }

  async getIncomingRequests(userId: number) {
    try {
      return await this.prisma.friendRequest.findMany({
        where: { receiverId: userId },
        include: { sender: { select: userSelect } }, // ИСПРАВЛЕНО
      });
    } catch (error) {
      console.error(`Ошибка в getIncomingRequests для пользователя ${userId}:`, error);
      throw error;
    }
  }
  
  // Поиск пользователей
    async searchUsers(userId: number, query?: string, city?: string, gender?: string, registeredAfter?: string) {
      // Базовое условие: не я сам и нет взаимных блокировок
      const whereClause: any = {
          id: { not: userId },
          AND: [
              { blockedBy: { none: { blockerId: userId } } },
              { blockedUsers: { none: { blockedId: userId } } }
          ]
      };

      // Фильтр по имени / логину
      if (query && query.trim().length > 0) {
          whereClause.OR = [
              { username: { contains: query.trim(), mode: 'insensitive' } },
              { name: { contains: query.trim(), mode: 'insensitive' } },
          ];
      }

      // Фильтр по городу (location)
      if (city && city.trim().length > 0) {
          whereClause.location = { contains: city.trim(), mode: 'insensitive' };
      }

      // Фильтр по полу
      if (gender && gender !== 'all') {
          whereClause.gender = gender;
      }

      // Фильтр по дате регистрации (создан позже указанной даты)
      if (registeredAfter) {
          whereClause.createdAt = { gte: new Date(registeredAfter) };
      }

      // Если нет ни одного фильтра, возвращаем пустой массив (чтобы не выгружать всю базу)
      if (!query && !city && (!gender || gender === 'all') && !registeredAfter) {
          return [];
      }

      return this.prisma.user.findMany({
          where: whereClause,
          select: userSelect,
          take: 20, // Увеличим лимит до 20, так как фильтры сужают поиск
          orderBy: { createdAt: 'desc' } // По умолчанию показываем самых новых
      });
  }

  // Отмена заявки
  async cancelRequest(userId: number, requestId: number) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request || request.senderId !== userId) {
      throw new NotFoundException("Заявка не найдена или у вас нет прав");
    }
    const result = await this.prisma.friendRequest.delete({ where: { id: requestId } });

    // 1. УДАЛЯЕМ УВЕДОМЛЕНИЕ О ЗАЯВКЕ У ПОЛУЧАТЕЛЯ
    await this.notificationsService.deleteFriendRequestNotification(request.receiverId, userId);

    // 2. Отправляем событие WebSocket получателю заявки, что его уведомления должны обновиться
    this.eventsGateway.server.to(`user_${request.receiverId}`).emit('notification_update');

    return result;
  }

  // Исходящие заявки
  async getOutgoingRequests(userId: number) {
    try {
      return await this.prisma.friendRequest.findMany({
        where: { senderId: userId },
        include: { receiver: { select: userSelect } }, // ИСПРАВЛЕНО
      });
    } catch (error) {
      console.error(`Ошибка в getOutgoingRequests для пользователя ${userId}:`, error);
      throw error;
    }
  }
}
