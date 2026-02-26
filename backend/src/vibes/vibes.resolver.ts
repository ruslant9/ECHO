import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { Vibe } from './models/vibe.model';
import { VibeComment } from './models/vibe-comment.model';
import { UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { User } from '../users/models/user.model';
import { NotificationsService } from '../notifications/notifications.service';

@Resolver(() => Vibe)
export class VibesResolver {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  @Mutation(() => Int)
  @UseGuards(JwtAuthGuard)
  async createVibe(
    @Context() ctx,
    @Args('videoUrl') videoUrl: string,
    @Args('description', { nullable: true }) description: string,
    @Args('hashtags', { type: () => [String] }) hashtags: string[],
    @Args('isPrivate') isPrivate: boolean,
  ) {
    const vibe = await this.prisma.vibe.create({
      data: {
        authorId: ctx.req.user.userId,
        videoUrl,
        description,
        hashtags,
        isPrivate,
      }
    });
    return vibe.id;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async repostVibe(@Context() ctx, @Args('vibeId', { type: () => Int }) vibeId: number) {
    const userId = ctx.req.user.userId;
    const vibe = await this.prisma.vibe.findUnique({ where: { id: vibeId } });
    if (!vibe) throw new NotFoundException('Вайб не найден');

    await this.prisma.$transaction([
      this.prisma.post.create({
        data: {
          authorId: userId,
          vibeId: vibeId,
          content: null,
          isPublished: true,
        }
      }),
      this.prisma.vibe.update({
        where: { id: vibeId },
        data: { repostsCount: { increment: 1 } }
      })
    ]);

    if (vibe.authorId !== userId) {
      await this.notificationsService.create(
        vibe.authorId, 'VIBE_REPOST', 'сделал(а) репост вашего вайба', userId, 
        undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
        vibe.id
      );
    }

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteVibe(
    @Context() ctx,
    @Args('vibeId', { type: () => Int }) vibeId: number
  ) {
    const userId = ctx.req.user.userId;
    const vibe = await this.prisma.vibe.findUnique({
      where: { id: vibeId }
    });

    if (!vibe) throw new NotFoundException('Вайб не найден');
    
    if (vibe.authorId !== userId) {
      throw new ForbiddenException('Вы не можете удалить чужой вайб');
    }

    await this.prisma.vibe.delete({
      where: { id: vibeId }
    });

    return true;
  }

  @Query(() => [User])
  @UseGuards(JwtAuthGuard)
  async getVibeLikes(@Context() ctx, @Args('vibeId', { type: () => Int }) vibeId: number) {
    const userId = ctx.req.user.userId;
    const vibe = await this.prisma.vibe.findUnique({ where: { id: vibeId } });
    
    if (!vibe) throw new NotFoundException('Вайб не найден');
    
    if (vibe.authorId !== userId) {
      throw new ForbiddenException('Только автор может просматривать лайки');
    }

    const likes = await this.prisma.vibeLike.findMany({
      where: { vibeId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return likes.map((like) => like.user);
  }

  @Query(() => Vibe, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async vibe(@Context() ctx, @Args('id', { type: () => Int }) id: number) {
    const userId = ctx.req.user.userId;
    const vibe = await this.prisma.vibe.findUnique({
      where: { id },
      include: {
        author: true,
        likes: { where: { userId } }
      }
    });

    if (!vibe) return null;

    if (vibe.isPrivate && vibe.authorId !== userId) {
      return null;
    }

    return { ...vibe, isLikedByUser: vibe.likes.length > 0 };
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async incrementVibeViews(@Args('vibeId', { type: () => Int }) vibeId: number) {
    try {
      await this.prisma.vibe.update({
        where: { id: vibeId },
        data: { viewsCount: { increment: 1 } }
      });
      return true;
    } catch (e) {
      return false;
    }
  }


  @Query(() => [User])
  @UseGuards(JwtAuthGuard)
  async getVibeReposters(@Context() ctx, @Args('vibeId', { type: () => Int }) vibeId: number) {
    const userId = ctx.req.user.userId;
    const vibe = await this.prisma.vibe.findUnique({ where: { id: vibeId } });
    
    if (!vibe) throw new NotFoundException('Вайб не найден');
    
    if (vibe.authorId !== userId) {
      throw new ForbiddenException('Только автор может просматривать репосты');
    }

    const reposts = await this.prisma.post.findMany({
      where: { vibeId, isPublished: true },
      include: {
        author: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const uniqueUsers = new Map();
    for (const post of reposts) {
       if (!uniqueUsers.has(post.author.id)) {
           uniqueUsers.set(post.author.id, post.author);
       }
    }
    return Array.from(uniqueUsers.values());
  }

  @Query(() => [Vibe])
  @UseGuards(JwtAuthGuard)
  async getVibesFeed(@Context() ctx, @Args('feedType') feedType: string) {
    const userId = ctx.req.user.userId;
    let whereClause: any = { isPrivate: false };

    if (feedType === 'FOLLOWING') {
      const following = await this.prisma.user.findMany({
        where: { followedBy: { some: { id: userId } } },
        select: { id: true }
      });

      const friendships = await this.prisma.friendship.findMany({
        where: { userId },
        select: { friendId: true }
      });

      const outgoingRequests = await this.prisma.friendRequest.findMany({
        where: { senderId: userId },
        select: { receiverId: true }
      });

      const targetUserIds = new Set([
        ...following.map(f => f.id),
        ...friendships.map(f => f.friendId),
        ...outgoingRequests.map(r => r.receiverId)
      ]);

      if (targetUserIds.size === 0) {
        return [];
      }

      whereClause = { 
        authorId: { in: Array.from(targetUserIds) },
        isPrivate: false 
      };
    }

    let vibes = await this.prisma.vibe.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: feedType === 'FOLLOWING' ? 50 : 100,
      include: {
        author: { select: { id: true, username: true, name: true, avatar: true } },
        likes: { where: { userId } } 
      }
    });

    if (feedType === 'FOR_YOU') {
      for (let i = vibes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [vibes[i], vibes[j]] = [vibes[j], vibes[i]];
      }
      vibes = vibes.slice(0, 10);
    }

    return vibes.map(vibe => ({
      ...vibe,
      isLikedByUser: vibe.likes.length > 0
    }));
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async toggleVibeLike(@Context() ctx, @Args('vibeId', { type: () => Int }) vibeId: number) {
    const userId = ctx.req.user.userId;
    const vibe = await this.prisma.vibe.findUnique({ where: { id: vibeId } });
    const existing = await this.prisma.vibeLike.findUnique({
      where: { vibeId_userId: { vibeId, userId } }
    });

    if (existing) {
      await this.prisma.vibeLike.delete({ where: { vibeId_userId: { vibeId, userId } } });
      await this.prisma.vibe.update({ where: { id: vibeId }, data: { likesCount: { decrement: 1 } } });
      
      if (vibe && vibe.authorId !== userId) {
         await this.notificationsService.deleteVibeLikeNotification(vibe.authorId, userId, vibeId);
      }
    } else {
      await this.prisma.vibeLike.create({ data: { vibeId, userId } });
      await this.prisma.vibe.update({ where: { id: vibeId }, data: { likesCount: { increment: 1 } } });
      
      if (vibe && vibe.authorId !== userId) {
         await this.notificationsService.create(
           vibe.authorId, 'VIBE_LIKE', 'оценил(а) ваш вайб', userId, 
           undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
           vibe.id
         );
      }
    }
    return true;
  }

  @Query(() => [VibeComment])
  @UseGuards(JwtAuthGuard)
  async getVibeComments(@Args('vibeId', { type: () => Int }) vibeId: number) {
    return this.prisma.vibeComment.findMany({
      where: { vibeId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, name: true, avatar: true } }
      }
    });
  }

   @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteVibeComment(
    @Context() ctx,
    @Args('commentId', { type: () => Int }) commentId: number
  ) {
    const userId = ctx.req.user.userId;

    const comment = await this.prisma.vibeComment.findUnique({
      where: { id: commentId },
      include: { vibe: true }
    });

    if (!comment) throw new NotFoundException('Комментарий не найден');

    const isCommentAuthor = comment.authorId === userId;
    const isVibeAuthor = comment.vibe.authorId === userId;

    if (!isCommentAuthor && !isVibeAuthor) {
      throw new ForbiddenException('Нет прав на удаление этого комментария');
    }

    await this.prisma.vibeComment.delete({
      where: { id: commentId }
    });

    await this.prisma.vibe.update({
      where: { id: comment.vibeId },
      data: { commentsCount: { decrement: 1 } }
    });

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async addVibeComment(
    @Context() ctx,
    @Args('vibeId', { type: () => Int }) vibeId: number,
    @Args('content') content: string
  ) {
    const userId = ctx.req.user.userId;
    const vibe = await this.prisma.vibe.findUnique({ where: { id: vibeId } });

    const comment = await this.prisma.vibeComment.create({
      data: {
        content,
        vibeId,
        authorId: userId
      }
    });
    await this.prisma.vibe.update({
      where: { id: vibeId },
      data: { commentsCount: { increment: 1 } }
    });

    if (vibe && vibe.authorId !== userId) {
       let snippet = content.substring(0, 30);
       if (content.length > 30) snippet += '...';
       
       await this.notificationsService.create(
         vibe.authorId, 'NEW_VIBE_COMMENT', `прокомментировал(а) ваш вайб: "${snippet}"`, userId, 
         undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
         vibe.id, comment.id
       );
    }

    return true;
  }
}