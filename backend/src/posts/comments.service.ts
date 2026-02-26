
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { VoteType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

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
export class CommentsService {
  constructor(
    private prisma: PrismaService, 
    private eventsGateway: EventsGateway,
    private notificationsService: NotificationsService,
  ) {}

  // Вспомогательная функция для генерации сниппета комментария
   private getCommentContentSnippet(comment: { content: string }): string {
    const snippet = comment.content.substring(0, 50);
    return snippet.length < comment.content.length ? `${snippet}...` : snippet;
  }

  async recalculateCommentsCount(postId: number): Promise<number> {
    const actualCommentsCount = await this.prisma.comment.count({
      where: { postId },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: actualCommentsCount },
    });
    
    return actualCommentsCount;
  }

  async findByPostId(postId: number, sort: 'new' | 'popular' = 'popular', userId?: number) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: sort === 'new' ? { createdAt: 'desc' } : { score: 'desc' },
      include: { 
        author: { select: userSelect }, // ИСПРАВЛЕНО
        replies: { 
          include: { author: { select: userSelect } }, // ИСПРАВЛЕНО
          orderBy: { createdAt: 'asc' } 
        } 
      },
    });

    if (!userId) {
      return comments;
    }

    const commentsWithVotes = await Promise.all(comments.map(async (comment) => {
        const vote = await this.prisma.commentVote.findUnique({
            where: { commentId_userId: { commentId: comment.id, userId } }
        });
        
        const repliesWithVotes = await Promise.all(comment.replies.map(async (reply) => {
             const replyVote = await this.prisma.commentVote.findUnique({
                where: { commentId_userId: { commentId: reply.id, userId } }
             });
             return { ...reply, userVote: replyVote?.type };
        }));

        return { ...comment, replies: repliesWithVotes, userVote: vote?.type };
    }));

    return commentsWithVotes;
  }

  async create(userId: number, postId: number, content: string, parentId?: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Пост не найден");
    if (post.commentsDisabled) {
      throw new ForbiddenException("Комментарии к этому посту отключены автором.");
    }
    
    let finalParentId = parentId;
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
      if (parent && parent.parentId) {
        finalParentId = parent.parentId;
      }
    }

    const comment = await this.prisma.comment.create({
      data: { authorId: userId, postId, content, parentId: finalParentId },
      include: { author: { select: userSelect } }, // ИСПРАВЛЕНО
    });

    if (post.authorId !== userId) {
        const snippet = this.getCommentContentSnippet(comment);
        this.notificationsService.create(
            post.authorId,
            'NEW_COMMENT',
            `прокомментировал(а) вашу публикацию: "${snippet}"`,
            userId,
            postId,
            comment.id
        );
    }

    const newCount = await this.recalculateCommentsCount(postId);
    
    this.eventsGateway.server.to(`post_room_${postId}`).emit(`new_comment_for_post_${postId}`, { 
        ...comment, 
        postCommentsCount: newCount 
    });
    
    return comment;
  }

  async vote(userId: number, commentId: number, type: VoteType) {
    const existing = await this.prisma.commentVote.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    const comment = await this.prisma.comment.findUnique({ where: { id: commentId }});
    if (!comment) throw new NotFoundException("Комментарий не найден");

    await this.prisma.$transaction(async (tx) => {
      if (existing && existing.type === type) {
        await tx.commentVote.delete({ where: { commentId_userId: { commentId, userId } } });
        await this.notificationsService.deleteLikeNotification(comment.authorId, userId, comment.postId, commentId);
      } else if (existing) {
        await tx.commentVote.update({ where: { commentId_userId: { commentId, userId } }, data: { type } });
        if (type === 'LIKE' && comment.authorId !== userId) {
             const snippet = this.getCommentContentSnippet(comment);
             // Здесь для комментариев мы не передаем imageUrl,
             // так как уведомление о лайке комментария обычно не содержит превью картинки,
             // но если бы была такая необходимость, можно было бы получить картинку поста, к которому относится комментарий.
             await this.notificationsService.create(
                 comment.authorId,
                 'COMMENT_LIKE',
                 `понравился ваш комментарий: "${snippet}"`,
                 userId,
                 comment.postId,
                 commentId
             );
        }

        if (type === 'DISLIKE' && comment.authorId !== userId) {
            await this.notificationsService.deleteLikeNotification(comment.authorId, userId, comment.postId, commentId);
        }

      } else {
        await tx.commentVote.create({ data: { commentId, userId, type } });

        if (type === 'LIKE' && comment.authorId !== userId) {
            const snippet = this.getCommentContentSnippet(comment);
            this.notificationsService.create(
                comment.authorId,
                'COMMENT_LIKE',
                `понравился ваш комментарий: "${snippet}"`,
                userId,
                comment.postId,
                commentId
            );
        }
      }
    });
    
    const likes = await this.prisma.commentVote.count({ where: { commentId, type: 'LIKE' } });
    const dislikes = await this.prisma.commentVote.count({ where: { commentId, type: 'DISLIKE' } });
    
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { 
        likesCount: likes, 
        dislikesCount: dislikes, 
        score: likes - dislikes 
      },
      include: { author: { select: userSelect } } // ИСПРАВЛЕНО
    });
    
    this.eventsGateway.server.to(`post_room_${updated.postId}`).emit(`comment_update_${commentId}`, updated);
    
    const currentUserVote = await this.prisma.commentVote.findUnique({
        where: { commentId_userId: { commentId, userId } }
    });

    // ОТПРАВКА СОБЫТИЯ ОБ ОБНОВЛЕНИИ ЛАЙКНУТОГО КОНТЕНТА
    this.eventsGateway.server.to(`profile_room_${userId}`).emit('liked_content_updated');
    
    return { ...updated, userVote: currentUserVote?.type };
  }

  async getCommentLikes(commentId: number) {
    const votes = await this.prisma.commentVote.findMany({
      where: { commentId, type: 'LIKE' },
      include: { user: { select: userSelect } }, // ИСПРАВЛЕНО
      take: 10,
      orderBy: { user: { username: 'asc' } }
    });
    return votes.map(vote => vote.user);
  }
  
  async delete(userId: number, commentId: number): Promise<number> {
     const comment = await this.prisma.comment.findUnique({ where: { id: commentId }, include: { post: true } });
     if (!comment) throw new NotFoundException("Комментарий не найден");
     
     if (comment.authorId !== userId && comment.post.authorId !== userId) {
         throw new ForbiddenException("Нет прав для удаления");
     }

     const postId = comment.postId;
     
     await this.prisma.comment.delete({ where: { id: commentId } });
     
     const newCommentsCount = await this.recalculateCommentsCount(postId);
     
     this.eventsGateway.server.to(`post_room_${postId}`).emit(`delete_comment_for_post_${postId}`, { commentId, newCommentsCount });
     
     return newCommentsCount;
  }

  async deleteMany(userId: number, commentIds: number[]): Promise<number> {
    const comments = await this.prisma.comment.findMany({
      where: { id: { in: commentIds } },
      include: { post: true }
    });

    if (comments.length === 0) return 0;

    const postId = comments[0].postId;
    const idsToDelete: number[] = [];

    for (const comment of comments) {
      if (comment.postId !== postId) continue;
      
      const canDelete = comment.authorId === userId || comment.post.authorId === userId;
      if (canDelete) {
        idsToDelete.push(comment.id);
      }
    }

    if (idsToDelete.length > 0) {
      await this.prisma.comment.deleteMany({
        where: { id: { in: idsToDelete } }
      });

      const newCount = await this.recalculateCommentsCount(postId);
      
      this.eventsGateway.server.to(`post_room_${postId}`).emit(`comments_bulk_deleted_${postId}`, { newCommentsCount: newCount });
      
      return newCount;
    }

    return 0;
  }

  async clear(userId: number, postId: number, type: 'ALL' | 'MINE' | 'OTHERS'): Promise<number> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Пост не найден");

    const isPostAuthor = post.authorId === userId;
    let whereCondition: any = { postId };

    if (type === 'ALL') {
      if (!isPostAuthor) throw new ForbiddenException("Только автор поста может удалить все комментарии");
    } else if (type === 'OTHERS') {
      if (!isPostAuthor) throw new ForbiddenException("Только автор поста может удалять чужие комментарии");
      whereCondition = { ...whereCondition, authorId: { not: userId } };
    } else if (type === 'MINE') {
      whereCondition = { ...whereCondition, authorId: userId };
    }

    await this.prisma.comment.deleteMany({ where: whereCondition });

    const newCount = await this.recalculateCommentsCount(postId);
    this.eventsGateway.server.to(`post_room_${postId}`).emit(`comments_cleared_${postId}`, { newCommentsCount: newCount });

    return newCount;
  }

  async update(userId: number, commentId: number, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    
    if (!comment) throw new NotFoundException("Комментарий не найден");
    if (comment.authorId !== userId) throw new ForbiddenException("Нет прав на редактирование");

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: { author: { select: userSelect } } // ИСПРАВЛЕНО
    });

    this.eventsGateway.server.to(`post_room_${comment.postId}`).emit(`comment_edited_${comment.postId}`, updatedComment); // Исправлено: теперь comment.postId

    return updatedComment;
  }
}
