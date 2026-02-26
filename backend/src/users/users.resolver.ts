import { Resolver, Query, Context, ResolveField, Parent, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, ConflictException, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { User } from './models/user.model';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserInput } from '../auth/dto/update-user.input';
import { EventsGateway } from '../events/events.gateway';
import { Post } from '../posts/models/post.model';
import { Comment } from '../posts/models/comment.model';
import { JwtAuthGuardOptional } from '../auth/jwt-auth-optional.guard';
import { User as PrismaUser, VoteType } from '@prisma/client';
import { Session } from './models/session.model';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import { UpdateNotificationSettingsInput } from './dto/update-notification-settings.input';
import { NotificationSettingsModel } from './models/notification-settings.model';
import { Vibe } from '../vibes/models/vibe.model';

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  password: true,
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
  isAdmin: true,
};

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private usersService: UsersService
  ) {}

  private async checkIsBlocked(userId1: number, userId2: number): Promise<boolean> {
    if (!userId1 || !userId2) return false;
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
    });
    return !!block;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async blockUser(@Context() context, @Args('targetId', { type: () => Int }) targetId: number) {
    return this.usersService.blockUser(context.req.user.userId, targetId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async unblockUser(@Context() context, @Args('targetId', { type: () => Int }) targetId: number) {
    return this.usersService.unblockUser(context.req.user.userId, targetId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteMyAccount(
    @Args('password') password: string,
    @Context() context,
  ): Promise<boolean> {
    const userId = context.req.user.userId;
    const success = await this.usersService.deleteAccount(userId, password);
    this.eventsGateway.server.to(`user_${userId}`).emit('account_deleted');
    return success;
  }

    @ResolveField(() => [Vibe])
  async vibes(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;

    // Если смотрит другой пользователь и он заблокирован — отдаем пустоту
    if (viewerId && viewerId !== user.id) {
        const isBlocked = await this.checkIsBlocked(viewerId, user.id);
        if (isBlocked) return [];
    }

    const vibesData = await this.prisma.vibe.findMany({
      where: { 
        authorId: user.id,
        // Если смотрим не свой профиль, то скрываем приватные вайбы
        isPrivate: viewerId === user.id ? undefined : false 
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: userSelect } // userSelect должен быть уже определен в файле
      }
    });

    if (!viewerId) {
      return vibesData.map(v => ({ ...v, isLikedByUser: false }));
    }

    // Подгружаем статус "лайкнул ли я" для каждого вайба
    const vibesWithLikeStatus = await Promise.all(vibesData.map(async (vibe) => {
        const like = await this.prisma.vibeLike.findUnique({
            where: { vibeId_userId: { vibeId: vibe.id, userId: viewerId } }
        });
        return { ...vibe, isLikedByUser: !!like }; 
    }));

    return vibesWithLikeStatus;
  }

   @ResolveField(() => [Post])
  async posts(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;

    if (viewerId && viewerId !== user.id) {
        const isBlocked = await this.checkIsBlocked(viewerId, user.id);
        if (isBlocked) return [];
    }

    const posts = await this.prisma.post.findMany({
      where: { 
        authorId: user.id,
        isPublished: true 
      },
      orderBy: [
        { isPinned: 'desc' }, 
        { createdAt: 'desc' } 
      ],
      include: { 
        author: { select: userSelect }, 
        vibe: { include: { author: { select: userSelect } } }, // <--- ДОБАВЛЕНО: подгружаем сам вайб
        originalPost: { 
          include: { 
            author: { select: userSelect },
            vibe: { include: { author: { select: userSelect } } } // <--- ДОБАВЛЕНО: подгружаем вайб для оригинального поста (если это репост)
          } 
        } 
      }
    });

    if (!viewerId) {
      return posts.map(post => ({ ...post, isLikedByUser: false }));
    }

    const postsWithLikeStatus = await Promise.all(posts.map(async (post) => {
        const like = await this.prisma.postLike.findUnique({
            where: { postId_userId: { postId: post.id, userId: viewerId } }
        });
        
        let isLiked = !!like;
        return { ...post, isLikedByUser: isLiked }; 
    }));

    return postsWithLikeStatus;
  }

  // --- ИСПРАВЛЕННЫЙ МЕТОД likedPosts ---
  @ResolveField(() => [Post])
  @UseGuards(JwtAuthGuardOptional)
  async likedPosts(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId; 

    if (viewerId && viewerId !== user.id) {
        const isBlocked = await this.checkIsBlocked(viewerId, user.id);
        if (isBlocked) return [];
    }

    const likedPostsData = await this.prisma.postLike.findMany({
      where: { userId: user.id }, 
      orderBy: { createdAt: 'desc' },
      include: { 
        post: {
          include: {
            author: { select: userSelect },
            vibe: { include: { author: { select: userSelect } } }, // <--- ДОБАВЛЕНО
            originalPost: { 
                include: { 
                    author: { select: userSelect },
                    vibe: { include: { author: { select: userSelect } } } // <--- ДОБАВЛЕНО
                } 
            },
            poll: { include: { options: true, votes: true } },
          }
        }
      }
    });

    return Promise.all(likedPostsData.map(async (pl) => {
      let isLikedByUser = false;
      if (viewerId) {
        const like = await this.prisma.postLike.findUnique({
          where: { postId_userId: { postId: pl.post.id, userId: viewerId } }
        });
        isLikedByUser = !!like;
      }
      return { ...pl.post, isLikedByUser };
    }));
  }

   @ResolveField(() => [Vibe])
  @UseGuards(JwtAuthGuardOptional)
  async likedVibes(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;

    // Если смотрит другой пользователь и он заблокирован — отдаем пустоту
    if (viewerId && viewerId !== user.id) {
        const isBlocked = await this.checkIsBlocked(viewerId, user.id);
        if (isBlocked) return [];
    }

    // Ищем лайки вайбов пользователя
    const likedVibesData = await this.prisma.vibeLike.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { 
        vibe: {
          include: {
            author: { select: userSelect } // Загружаем автора вайба
          }
        }
      }
    });

    // Фильтруем: чужие приватные вайбы скрываем
    const validVibes = likedVibesData
      .map(vl => vl.vibe)
      .filter(v => viewerId === user.id || !v.isPrivate);

    // Добавляем флаг isLikedByUser (лайкнул ли смотрящий этот вайб)
    return Promise.all(validVibes.map(async (vibe) => {
      let isLikedByUser = false;
      if (viewerId) {
        const like = await this.prisma.vibeLike.findUnique({
          where: { vibeId_userId: { vibeId: vibe.id, userId: viewerId } }
        });
        isLikedByUser = !!like;
      }
      return { ...vibe, isLikedByUser };
    }));
  }
  
  @ResolveField(() => [Comment])
  @UseGuards(JwtAuthGuardOptional)
  async likedComments(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;

    if (viewerId && viewerId !== user.id) {
        const isBlocked = await this.checkIsBlocked(viewerId, user.id);
        if (isBlocked) return [];
    }

    const likedCommentsData = await this.prisma.commentVote.findMany({
      where: { userId: user.id, type: VoteType.LIKE },
      orderBy: { 
        comment: { createdAt: 'desc' } 
      },
      include: { 
        comment: {
          include: {
            author: { select: userSelect },
            post: {
              select: { id: true, content: true, images: true }
            }
          }
        }
      }
    });

    return Promise.all(likedCommentsData.map(async (cv) => {
      let userVote: 'LIKE' | 'DISLIKE' | null = null;
      if (viewerId) {
        const vote = await this.prisma.commentVote.findUnique({
          where: { commentId_userId: { commentId: cv.comment.id, userId: viewerId } }
        });
        userVote = (vote?.type as 'LIKE' | 'DISLIKE') || null;
      }
      return { 
        ...cv.comment, 
        userVote,
        likesCount: await this.prisma.commentVote.count({ where: { commentId: cv.comment.id, type: VoteType.LIKE } }),
        dislikesCount: await this.prisma.commentVote.count({ where: { commentId: cv.comment.id, type: VoteType.DISLIKE } }),
        score: (await this.prisma.commentVote.count({ where: { commentId: cv.comment.id, type: VoteType.LIKE } })) - 
               (await this.prisma.commentVote.count({ where: { commentId: cv.comment.id, type: VoteType.DISLIKE } })),
      };
    }));
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@Context() context) {
    return this.prisma.user.findUnique({
      where: { id: context.req.user.userId },
      select: userSelect
    });
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuardOptional)
  async user(@Args('id', { type: () => Int }) id: number) { 
    const found = await this.prisma.user.findUnique({ 
        where: { id },
        select: userSelect
    });
    if (!found) {
      throw new NotFoundException('Пользователь не найден');
    }
    return found;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async terminateSession(
    @Args('sessionId', { type: () => Int }) sessionId: number,
    @Args('password') password: string, 
    @Context() context,
  ): Promise<boolean> {
    const currentUserId = context.req.user.userId;

    const user = await this.prisma.user.findUnique({ where: { id: currentUserId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный пароль');
    }

    const sessionToTerminate = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!sessionToTerminate || sessionToTerminate.userId !== currentUserId) {
      throw new ForbiddenException('Нет прав для завершения этой сессии');
    }

    await this.prisma.session.delete({ where: { id: sessionId } });

    this.eventsGateway.server.to(`user_${currentUserId}`).emit('session_terminated', { token: sessionToTerminate.token });

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async terminateAllOtherSessions(
    @Args('password') password: string,
    @Context() context
  ): Promise<boolean> {
    const userId = context.req.user.userId;
    const currentToken = context.req.headers.authorization?.split(' ')[1];

    if (!currentToken) return false;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный пароль');
    }

    await this.usersService.terminateAllOtherSessions(userId, currentToken);
    
    return true;
  }

  @Query(() => [Session])
  @UseGuards(JwtAuthGuard)
  async mySessions(@Context() context) {
    const userId = context.req.user.userId;
    const currentToken = context.req.headers.authorization?.split(' ')[1];

    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastActive: 'desc' },
      take: 10 
    });

    return sessions.map(s => ({
      ...s,
      isCurrent: s.token === currentToken
    }));
  }

  @Query(() => NotificationSettingsModel)
  @UseGuards(JwtAuthGuard)
  async myNotificationSettings(@Context() context): Promise<NotificationSettingsModel> {
    const userId = context.req.user.userId;
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });
    return settings || { 
      id: null,
      userId: userId, 
      notifyOnLikes: true, 
      notifyOnComments: true, 
      notifyOnReposts: true, 
      notifyOnMessages: true, 
      notifyOnFriendRequests: true, 
      notificationSound: 'default',
      muteAllUntil: null
    };
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async updateNotificationSettings(
    @Context() context,
    @Args('input') input: UpdateNotificationSettingsInput,
  ): Promise<boolean> {
    const userId = context.req.user.userId;

    await this.prisma.notificationSettings.upsert({
      where: { userId },
      update: input,
      create: {
        userId,
        ...input,
      },
    });

    return true;
  }

  @Query(() => Boolean)
  async checkUsername(@Args('username') username: string) {
    const count = await this.prisma.user.count({ where: { username } });
    return count === 0;
  }

  @Mutation(() => User)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Context() context,
    @Args('input') input: UpdateUserInput,
  ) {
    const userId = context.req.user.userId;

    if (input.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username: input.username,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('Это имя пользователя уже занято');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { ...input },
      select: userSelect 
    });

    this.eventsGateway.server.emit('user_profile_updated', { userId: updatedUser.id, username: updatedUser.username });

    return updatedUser;
  }

   @ResolveField(() => Int)
  async postsCount(@Parent() user: PrismaUser) {
    return this.prisma.post.count({ 
      where: { 
        authorId: user.id,
        isPublished: true
      } 
    });
  }

  @ResolveField(() => Int)
  async friendsCount(@Parent() user: PrismaUser) {
    return this.prisma.friendship.count({
      where: { userId: user.id },
    });
  }

  @ResolveField(() => Int)
  async subscriptionsCount(@Parent() user: PrismaUser) {
    const followingCount = await this.prisma.user.count({
      where: { followedBy: { some: { id: user.id } } },
    });
    const outgoingRequestsCount = await this.prisma.friendRequest.count({
      where: { senderId: user.id },
    });
    return followingCount + outgoingRequestsCount;
  }

  @ResolveField(() => Int)
  async followersCount(@Parent() user: PrismaUser) {
    const directFollowers = await this.prisma.user.findMany({
      where: { following: { some: { id: user.id } } },
      select: { id: true }
    });

    const incomingRequests = await this.prisma.friendRequest.findMany({
      where: { receiverId: user.id },
      select: { senderId: true }
    });

    const allInterestedUserIds = new Set([
      ...directFollowers.map(f => f.id),
      ...incomingRequests.map(r => r.senderId)
    ]);

    return allInterestedUserIds.size;
  }

  @ResolveField(() => [User])
  async friends(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (viewerId && viewerId !== user.id) {
        const isBlocked = await this.checkIsBlocked(viewerId, user.id);
        if (isBlocked) return [];
    }

    const friendships = await this.prisma.friendship.findMany({
      where: { userId: user.id },
      include: { friend: { select: userSelect } }, 
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return friendships.map((f) => f.friend);
  }

  @ResolveField(() => [User])
  async subscriptions(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (viewerId && viewerId !== user.id) {
        const isBlocked = await this.checkIsBlocked(viewerId, user.id);
        if (isBlocked) return [];
    }

    const following = await this.prisma.user.findMany({
      where: { followedBy: { some: { id: user.id } } },
      select: userSelect, 
      take: 50,
    });

    const outgoingRequests = await this.prisma.friendRequest.findMany({
      where: { senderId: user.id },
      include: { receiver: { select: userSelect } }, 
      take: 50,
    });

    const outgoingUsers = outgoingRequests.map((req) => req.receiver);
    
    const uniqueUsersMap = new Map<number, PrismaUser>();
    [...following, ...outgoingUsers].forEach(u => uniqueUsersMap.set(u.id, u));

    return Array.from(uniqueUsersMap.values());
  }

  @ResolveField(() => [User])
  async followers(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (viewerId && viewerId !== user.id) {
        const isBlocked = await this.checkIsBlocked(viewerId, user.id);
        if (isBlocked) return [];
    }

    const directFollowers = await this.prisma.user.findMany({
      where: { following: { some: { id: user.id } } },
      select: userSelect, 
      take: 50,
    });

    const incomingRequests = await this.prisma.friendRequest.findMany({
      where: { receiverId: user.id },
      include: { sender: { select: userSelect } }, 
      take: 50,
    });
    const incomingRequestSenders = incomingRequests.map(r => r.sender);

    const uniqueUsersMap = new Map<number, PrismaUser>();
    [...directFollowers, ...incomingRequestSenders].forEach(u => uniqueUsersMap.set(u.id, u));

    return Array.from(uniqueUsersMap.values());
  }

  @ResolveField(() => String, { nullable: true })
  async friendshipStatus(@Parent() profileUser: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (!viewerId || viewerId === profileUser.id) return null;

    const isBlocked = await this.checkIsBlocked(viewerId, profileUser.id);
    if (isBlocked) return 'NONE';

    const isFriend = await this.prisma.friendship.findFirst({
      where: { userId: viewerId, friendId: profileUser.id },
    });
    if (isFriend) return 'FRIEND';

    const sentRequest = await this.prisma.friendRequest.findFirst({
      where: { senderId: viewerId, receiverId: profileUser.id },
    });
    if (sentRequest) return 'REQUEST_SENT';

    const receivedRequest = await this.prisma.friendRequest.findFirst({
      where: { senderId: profileUser.id, receiverId: viewerId },
    });
    if (receivedRequest) return 'REQUEST_RECEIVED';

    return 'NONE'; 
  }

  @ResolveField(() => Int, { nullable: true })
  async sentFriendRequestId(@Parent() profileUser: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (!viewerId) return null;

    const request = await this.prisma.friendRequest.findFirst({
      where: { senderId: viewerId, receiverId: profileUser.id },
    });
    return request?.id;
  }

  @ResolveField(() => Int, { nullable: true })
  async receivedFriendRequestId(@Parent() profileUser: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (!viewerId) return null;

    const request = await this.prisma.friendRequest.findFirst({
      where: { senderId: profileUser.id, receiverId: viewerId },
    });
    return request?.id;
  }

  // --- ПОЛЯ, СКРЫВАЕМЫЕ ПРИ БЛОКИРОВКЕ ---

  @ResolveField(() => String, { nullable: true })
  async avatar(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (viewerId && viewerId !== user.id) {
       const amIBlocked = await this.usersService.isBlocked(user.id, viewerId);
       if (amIBlocked) return null;
    }
    return user.avatar;
  }

  @ResolveField(() => Boolean)
  async isOnline(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (viewerId && viewerId !== user.id) {
       const amIBlocked = await this.usersService.isBlocked(user.id, viewerId);
       if (amIBlocked) return false;
    }
    return user.isOnline;
  }
  
  @ResolveField(() => Date, { nullable: true })
  async lastOnlineAt(@Parent() user: PrismaUser, @Context() context) {
    const viewerId = context.req.user?.userId;
    if (viewerId && viewerId !== user.id) {
       const amIBlocked = await this.usersService.isBlocked(user.id, viewerId);
       if (amIBlocked) return null;
    }
    return user.lastOnlineAt;
  }

  @ResolveField(() => Boolean)
  async amIBlocked(@Parent() user: PrismaUser, @Context() context): Promise<boolean> {
    const viewerId = context.req.user?.userId;
    if (!viewerId) return false;
    // Проверяем: заблокировал ли Владелец профиля (user.id) Смотрящего (viewerId)
    return this.usersService.isBlocked(user.id, viewerId);
  }

  @ResolveField(() => Boolean)
  async isBlockedByMe(@Parent() user: PrismaUser, @Context() context): Promise<boolean> {
    const viewerId = context.req.user?.userId;
    if (!viewerId) return false;
    // Проверяем: заблокировал ли Смотрящий (viewerId) Владельца профиля (user.id)
    return this.usersService.isBlocked(viewerId, user.id);
  }
}