// backend/src/tasks/tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private notificationsService: NotificationsService,
  ) {}

  // Запускать каждую минуту
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPosts() {
    const now = new Date();
    this.logger.debug('Checking for scheduled posts to publish...');

    const postsToPublish = await this.prisma.post.findMany({
      where: {
        isPublished: false,
        scheduledAt: {
          lte: now, // scheduledAt меньше или равно текущему времени
        },
      },
      include: {
        author: true, // Включаем автора для отправки уведомлений
      },
    });

    if (postsToPublish.length > 0) {
      this.logger.log(`Found ${postsToPublish.length} scheduled posts to publish.`);

      for (const post of postsToPublish) {
        try {
          // Публикуем пост
          await this.prisma.post.update({
            where: { id: post.id },
            data: {
              isPublished: true,
              scheduledAt: null, // Очищаем scheduledAt
              createdAt: new Date(), // Устанавливаем время публикации на текущее
            },
          });
          this.logger.log(`Post ${post.id} by user ${post.authorId} published automatically.`);

          // Отправляем socket.io событие для обновления клиентов
          this.eventsGateway.server.emit('post_published', { postId: post.id, authorId: post.authorId });
          // Обновляем ленту профиля автора
          this.eventsGateway.server.to(`profile_room_${post.authorId}`).emit('profile_posts_updated');


          // Отправляем уведомление автору
          const contentSnippet = this.getPostContentSnippet(post);
          const firstImage = post.images && post.images.length > 0 ? post.images[0] : undefined;

          await this.notificationsService.create(
            post.authorId,
            'POST_PUBLISHED', // Новый тип уведомления
            `Ваш отложенный пост "${contentSnippet}" был опубликован.`,
            undefined, // Нет конкретного инициатора для авто-публикации
            post.id,
            undefined,
            undefined,
            undefined,
            firstImage
          );

        } catch (error) {
          this.logger.error(`Failed to publish post ${post.id}: ${error.message}`);
        }
      }
    }
  }

  // Вспомогательная функция для формирования сниппета контента, скопированная из PostsService
  private getPostContentSnippet(post: { content?: string, images: string[] }): string {
    if (post.content && post.content.trim().length > 0) {
      const snippet = post.content.substring(0, 50);
      return snippet.length < post.content.length ? `${snippet}...` : snippet;
    }
    if (post.images && post.images.length > 0) {
      return `[${post.images.length} изображени${post.images.length === 1 ? 'е' : 'й'}]`;
    }
    return '[Без контента]';
  }
}