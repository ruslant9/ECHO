import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { CommentsService } from './comments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FeedItem } from './models/feed-item.model';

// --- ОБЩИЙ ОБЪЕКТ SELECT ДЛЯ ПОЛЕЙ ПОЛЬЗОВАТЕЛЯ ---
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
// ----------------------------------------------------

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService, 
    private eventsGateway: EventsGateway,
    private commentsService: CommentsService,
    private notificationsService: NotificationsService,
  ) {}

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

  private async _attachLikedStatusToPost<T extends { id: number; originalPost?: any }>(post: T, viewerId: number | undefined): Promise<T & { isLikedByUser: boolean }> {
    let isLikedByUser = false;
    if (viewerId) {
      const like = await this.prisma.postLike.findUnique({
        where: {
          postId_userId: {
            postId: post.id,
            userId: viewerId
          }
        },
        select: { userId: true }
      });
      isLikedByUser = !!like;
    }

    const resultPost = { ...post, isLikedByUser } as T & { isLikedByUser: boolean };

    if (resultPost.originalPost && typeof resultPost.originalPost.id === 'number') {
      resultPost.originalPost = await this._attachLikedStatusToPost(resultPost.originalPost, viewerId);
    }
    
    return resultPost;
  }

  async create(userId: number, input: CreatePostInput) {
    const { content, images, commentsDisabled, poll, scheduledAt } = input;
    
    const isPublished = !scheduledAt;

    const newPost = await this.prisma.post.create({
      data: { 
        authorId: userId, 
        content, 
        isPublished,
        scheduledAt,
        images: images || [],
        commentsDisabled: commentsDisabled || false,
        ...(poll && { 
          poll: {
            create: { 
              question: poll.question,
              endDate: poll.endDate,
              isAnonymous: poll.isAnonymous,
              allowMultipleVotes: poll.allowMultipleVotes,
              allowRevote: poll.allowRevote,
              options: {
                createMany: { 
                  data: poll.options.map(option => ({ text: option.text })),
                },
              },
            },
          },
        }),
      },
      include: { 
        author: { select: userSelect },
        poll: {
          include: {
            options: true,
          },
        },
      },
    });
    
    if (isPublished) {
      this.eventsGateway.server.to(`profile_room_${userId}`).emit('profile_posts_updated');
    }

    return newPost;
  }
  
  async update(userId: number, postId: number, input: UpdatePostInput) {
    const post = await this.prisma.post.findUnique({ 
        where: { id: postId },
        include: { poll: true }
    });
    
    if (!post) throw new NotFoundException("Пост не найден");
    if (post.authorId !== userId) throw new ForbiddenException("Нет прав на редактирование");

    if (input.endPoll && post.poll) {
        await this.prisma.poll.update({
            where: { id: post.poll.id },
            data: { endDate: new Date() }
        });
        
        this.eventsGateway.server.to(`post_room_${postId}`).emit(`poll_update_${post.poll.id}`, {
             id: post.poll.id,
        });
    }

    return this.prisma.post.update({
    where: { id: postId },
    data: { 
        content: input.content,
        commentsDisabled: input.commentsDisabled,
        images: input.images,
    },
    include: { author: { select: userSelect }, poll: true }
  });
}

  async findAll(sort: 'new' | 'popular' = 'new') {
    return this.prisma.post.findMany({
      where: { isPublished: true },
      orderBy: sort === 'new' ? { createdAt: 'desc' } : { likesCount: 'desc' },
      include: { 
        author: { select: userSelect },
        poll: {
          include: {
            options: true,
            votes: true, 
          },
        },
      },
    });
  }

  async findOne(id: number, viewerId?: number) { 
    await this.commentsService.recalculateCommentsCount(id);

    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { 
        author: { select: userSelect },
        originalPost: { include: { author: { select: userSelect } } },
        poll: {
          include: {
            options: true,
            votes: true, 
          },
        },
      }
    });

    if (!post) {
      return null;
    }

    // Если viewerId передан, можно добавить проверку блокировки здесь, 
    // но обычно это делается на уровне резолвера или доступа к профилю.
    // В данном случае, если пост прямой ссылкой, он может быть доступен, если профиль открыт.
    // Если нужно скрыть пост заблокированного юзера даже по прямой ссылке:
    if (viewerId && viewerId !== post.authorId) {
        const block = await this.prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: viewerId, blockedId: post.authorId },
                    { blockerId: post.authorId, blockedId: viewerId }
                ]
            }
        });
        if (block) throw new ForbiddenException('Контент недоступен');
    }

    if (viewerId) {
      return this._attachLikedStatusToPost(post, viewerId);
    }

    return { ...post, isLikedByUser: false };
  }

  async toggleLike(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Пост не найден");

    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.postLike.delete({ where: { postId_userId: { postId, userId } } });
        await tx.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } });
        
        await this.notificationsService.deleteLikeNotification(post.authorId, userId, postId);

      } else {
        await tx.postLike.create({ data: { postId, userId } });
        await tx.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });
        
        if (post.authorId !== userId) {
            const snippet = this.getPostContentSnippet(post);
            const firstImage = post.images && post.images.length > 0 ? post.images[0] : undefined;
            this.notificationsService.create(
                post.authorId,
                'POST_LIKE',
                `понравилась ваша публикация: "${snippet}"`,
                userId,
                postId,
                undefined,
                undefined,
                undefined,
                firstImage
            );
        }
      }
    });

    const updatedPost = await this.prisma.post.findUnique({ where: { id: postId } });
    this.eventsGateway.server.emit(`post_update_${postId}`, { likesCount: updatedPost.likesCount });
    
    this.eventsGateway.server.to(`profile_room_${userId}`).emit('liked_content_updated');

    return updatedPost;
  }

  async repost(userId: number, postId: number) {
    const originalPost = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!originalPost) throw new NotFoundException("Пост не найден");

    const targetPostId = originalPost.originalPostId || originalPost.id;

    const result = await this.prisma.$transaction(async (tx) => {
        const newRepost = await tx.post.create({
            data: {
                authorId: userId,
                originalPostId: targetPostId,
                repostedById: userId,
                images: [], 
                content: null, 
                isPublished: true,
            },
            include: { author: { select: userSelect }, originalPost: { include: { author: { select: userSelect } } } }
        });

        await tx.post.update({
            where: { id: targetPostId },
            data: { repostsCount: { increment: 1 } }
        });

        return newRepost;
    });

    if (originalPost.authorId !== userId) {
        const snippet = this.getPostContentSnippet(originalPost);
        const firstImage = originalPost.images && originalPost.images.length > 0 ? originalPost.images[0] : undefined;
        this.notificationsService.create(
            originalPost.authorId,
            'REPOST',
            `сделал(а) репост вашей публикации: "${snippet}"`,
            userId,
            targetPostId,
            undefined, 
            undefined, 
            undefined, 
            firstImage 
        );
    }
    
    const updatedPost = await this.prisma.post.findUnique({ where: { id: targetPostId } });

    this.eventsGateway.server.emit(`post_update_${targetPostId}`, { 
        id: targetPostId,
        repostsCount: updatedPost.repostsCount 
    });

    this.eventsGateway.server.to(`profile_room_${userId}`).emit('profile_posts_updated');

    return result;
  }

 async getRecommendationFeed(userId: number): Promise<FeedItem[]> {
    // 1. Получаем список блокировок (Я заблокировал ИЛИ Меня заблокировали)
    const blocks = await this.prisma.block.findMany({
        where: {
            OR: [
                { blockerId: userId },
                { blockedId: userId }
            ]
        }
    });

    const excludedUserIds = new Set<number>();
    // Добавляем ID пользователей, с которыми есть блокировка
    blocks.forEach(b => {
        excludedUserIds.add(b.blockerId);
        excludedUserIds.add(b.blockedId);
    });
    // Себя исключать из массива `notIn` не обязательно, так как мы отдельно добавляем `userId` в запросы,
    // но для чистоты можно удалить себя из сета, если попали туда как инициатор
    excludedUserIds.delete(userId);
    
    const excludedIdsArray = Array.from(excludedUserIds);

    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const friendIds = friendships.map((f) => f.friendId);

    const sentRequests = await this.prisma.friendRequest.findMany({
      where: { senderId: userId },
      select: { receiverId: true }
    });
    const sentRequestIds = sentRequests.map(r => r.receiverId);

    const postIncludeOptions = {
        author: { select: userSelect },
        poll: { include: { options: true, votes: true } },
        vibe: { include: { author: { select: userSelect } } }, // <--- ДОБАВИТЬ ЭТО
        originalPost: { 
            select: { 
                id: true, createdAt: true, updatedAt: true, content: true, images: true, 
                commentsDisabled: true, isPinned: true, likesCount: true, repostsCount: true, 
                commentsCount: true, authorId: true, originalPostId: true, repostedById: true, 
                isPublished: true, 
                scheduledAt: true,
                author: { select: userSelect },
                poll: { include: { options: true, votes: true } },
                vibe: { include: { author: { select: userSelect } } } // <--- И ДОБАВИТЬ СЮДА
            },
        },
    };


    const rawTopPosts = await this.prisma.post.findMany({
        where: { 
            // Исключаем друзей, себя И ЗАБЛОКИРОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ
            authorId: { notIn: [...friendIds, userId, ...excludedIdsArray] }, 
            likesCount: { gt: 0 },
            isPublished: true 
        },
        orderBy: { likesCount: 'desc' },
        take: 20,
        include: postIncludeOptions, 
    });

    const rawFriendPosts = await this.prisma.post.findMany({
        where: { 
            // Друзья теоретически не могут быть заблокированы (блокировка удаляет дружбу), но на всякий случай
            authorId: { in: friendIds, notIn: excludedIdsArray },
            isPublished: true 
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: postIncludeOptions, 
    });

    const popularComments = await this.prisma.comment.findMany({
        where: { 
            post: { 
                authorId: { in: friendIds, notIn: excludedIdsArray }, 
                isPublished: true 
            }, 
            score: { gt: 0 },
            // Исключаем комментарии от заблокированных пользователей
            authorId: { notIn: excludedIdsArray }
        },
        orderBy: { score: 'desc' },
        take: 10,
        include: { author: { select: userSelect }, post: { include: { author: { select: userSelect } } } },
    });

    const suggestions = await this.prisma.user.findMany({
        where: {
            id: { notIn: [...friendIds, ...sentRequestIds, userId, ...excludedIdsArray] },
        },
        select: userSelect, 
        take: 50, 
        orderBy: { createdAt: 'desc' } 
    });

    for (let i = suggestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [suggestions[i], suggestions[j]] = [suggestions[j], suggestions[i]];
    }

    const rawStrangerPosts = await this.prisma.post.findMany({
        where: { 
            authorId: { notIn: [...friendIds, userId, ...excludedIdsArray] },
            isPublished: true
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: postIncludeOptions, 
    });

    const topPostsWithStatus = await Promise.all(rawTopPosts.map(p => this._attachLikedStatusToPost(p, userId)));
    const friendPostsWithStatus = await Promise.all(rawFriendPosts.map(p => this._attachLikedStatusToPost(p, userId)));
    const strangerPostsWithStatus = await Promise.all(rawStrangerPosts.map(p => this._attachLikedStatusToPost(p, userId)));

    const feed: FeedItem[] = [];
    const addedPostIds = new Set<number>(); 

    const maxCycles = 10; 

    let topIdx = 0;
    let friendIdx = 0;
    let commentIdx = 0;
    let suggIdx = 0;
    let strangerIdx = 0;

    for (let i = 0; i < maxCycles; i++) {
        while (topPostsWithStatus[topIdx] && addedPostIds.has(topPostsWithStatus[topIdx].id)) topIdx++;
        if (topPostsWithStatus[topIdx]) {
            const post = topPostsWithStatus[topIdx];
            feed.push({ type: 'TOP_POST', post });
            addedPostIds.add(post.id);
            topIdx++;
        }

        while (friendPostsWithStatus[friendIdx] && addedPostIds.has(friendPostsWithStatus[friendIdx].id)) friendIdx++;
        if (friendPostsWithStatus[friendIdx]) {
            const post = friendPostsWithStatus[friendIdx];
            feed.push({ type: 'FRIEND_POST', post });
            addedPostIds.add(post.id);
            friendIdx++;
        }

        while (popularComments[commentIdx] && addedPostIds.has(popularComments[commentIdx].postId)) commentIdx++;
        if (popularComments[commentIdx]) {
            const comment = popularComments[commentIdx];
            feed.push({ type: 'POPULAR_COMMENT', comment });
            addedPostIds.add(comment.postId);
            commentIdx++;
        }

        if (i % 2 === 0) { 
            const chunk = suggestions.slice(suggIdx, suggIdx + 5);
            if (chunk.length > 0) {
                feed.push({ type: 'USER_CAROUSEL', users: chunk });
                suggIdx += 5; 
            }
        }

        while (strangerPostsWithStatus[strangerIdx] && addedPostIds.has(strangerPostsWithStatus[strangerIdx].id)) strangerIdx++;
        if (strangerPostsWithStatus[strangerIdx]) {
            const post = strangerPostsWithStatus[strangerIdx];
            feed.push({ type: 'STRANGER_POST', post });
            addedPostIds.add(post.id);
            strangerIdx++;
        }

        while (friendPostsWithStatus[friendIdx] && addedPostIds.has(friendPostsWithStatus[friendIdx].id)) friendIdx++;
        if (friendPostsWithStatus[friendIdx]) {
            const post = friendPostsWithStatus[friendIdx];
            feed.push({ type: 'FRIEND_POST', post });
            addedPostIds.add(post.id);
            friendIdx++;
        }
    }

    return feed;
  }

  async togglePin(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Пост не найден");
    if (post.authorId !== userId) throw new ForbiddenException("Можно закреплять только свои посты");

    const isAlreadyPinned = post.isPinned;

    await this.prisma.$transaction(async (tx) => {
        await tx.post.updateMany({
            where: { authorId: userId, isPinned: true },
            data: { isPinned: false }
        });

        if (!isAlreadyPinned) {
            await tx.post.update({
                where: { id: postId },
                data: { isPinned: true }
            });
        }
    });

    this.eventsGateway.server.to(`profile_room_${userId}`).emit('profile_posts_updated');
    
    return true;
  }

  async getPostLikes(postId: number) {
    const likes = await this.prisma.postLike.findMany({
      where: { postId },
      include: { user: { select: userSelect } },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    return likes.map(like => like.user);
  }

  async getPostReposters(postId: number) {
    const reposts = await this.prisma.post.findMany({
      where: { originalPostId: postId, isPublished: true },
      include: {
        author: { select: userSelect },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return reposts.map(repost => repost.author);
  }

  async delete(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== userId) throw new ForbiddenException("Нет прав для удаления поста");
    
    await this.prisma.post.delete({ where: { id: postId } });
    
    if (post.isPublished) {
        this.eventsGateway.server.emit('post_deleted', { id: postId }); 
    }

    this.eventsGateway.server.to(`profile_room_${post.authorId}`).emit('profile_posts_updated');
    
    return true;
  }

  async togglePollVote(userId: number, pollId: number, optionIds: number[]) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { 
        options: true,
        post: { select: { id: true } }
      },
    });

    if (!poll) {
      throw new NotFoundException('Опрос не найден');
    }
    if (new Date() > poll.endDate) {
      throw new ForbiddenException('Голосование завершено');
    }
    if (!poll.allowMultipleVotes && optionIds.length > 1) {
      throw new ConflictException('Этот опрос не позволяет выбирать несколько вариантов');
    }

    const validOptionIds = new Set(poll.options.map(opt => opt.id));
    for (const id of optionIds) {
      if (!validOptionIds.has(id)) {
        throw new NotFoundException(`Вариант ${id} не принадлежит этому опросу`);
      }
    }

    const userCurrentVotes = await this.prisma.pollVote.findMany({
      where: { userId, pollId },
      select: { pollOptionId: true },
    });
    const userCurrentVoteIds = new Set(userCurrentVotes.map(v => v.pollOptionId));

    if (!poll.allowRevote && userCurrentVoteIds.size > 0) {
        throw new ForbiddenException('Изменение голоса в этом опросе запрещено автором');
    }

    const votesToAdd: number[] = [];
    const votesToRemove: number[] = [];

    if (poll.allowMultipleVotes) {
      for (const newOptionId of optionIds) {
        if (userCurrentVoteIds.has(newOptionId)) {
          votesToRemove.push(newOptionId);
        } else {
          votesToAdd.push(newOptionId);
        }
      }
      for (const currentOptionId of userCurrentVoteIds) {
          if (!optionIds.includes(currentOptionId)) {
              votesToRemove.push(currentOptionId);
          }
      }
    } else {
      if (userCurrentVoteIds.size > 0) {
        votesToRemove.push(...Array.from(userCurrentVoteIds));
      }
      if (optionIds.length > 0) {
        votesToAdd.push(optionIds[0]);
      }
    }

    await this.prisma.$transaction(async (tx) => {
        if (votesToRemove.length > 0) {
            await tx.pollVote.deleteMany({
                where: {
                    userId,
                    pollId,
                    pollOptionId: { in: votesToRemove }
                },
            });
        }
        if (votesToAdd.length > 0) {
            await tx.pollVote.createMany({
                data: votesToAdd.map(optionId => ({
                    userId,
                    pollId,
                    pollOptionId: optionId,
                })),
                skipDuplicates: true,
            });
        }
    });

    const updatedPoll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { 
        options: true,
        votes: true,
      },
    });

    if (!updatedPoll) {
      throw new NotFoundException('Опрос не найден после обновления');
    }

    const optionsWithCounts = updatedPoll.options.map(option => ({
      ...option,
      votesCount: updatedPoll.votes.filter(vote => vote.pollOptionId === option.id).length,
    }));

    this.eventsGateway.server.emit(`poll_update_${pollId}`, {
      id: updatedPoll.id,
      options: optionsWithCounts,
    });
    
    this.eventsGateway.server.to(`profile_room_${userId}`).emit('liked_content_updated');

    return { ...updatedPoll, options: optionsWithCounts };
  }

  async getPollVoters(userId: number, pollId: number) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) throw new NotFoundException('Опрос не найден');
    if (poll.isAnonymous) {
      throw new ForbiddenException('Этот опрос анонимный');
    }

    const votes = await this.prisma.pollVote.findMany({
      where: { pollId },
      include: {
        user: { select: userSelect },
      },
    });

    return votes.map(vote => ({
      optionId: vote.pollOptionId,
      user: vote.user,
    }));
  }

  async getUserPollVotes(userId: number, pollId: number) {
    const votes = await this.prisma.pollVote.findMany({
        where: { userId, pollId },
        select: { pollOptionId: true },
    });

    return votes.map(v => ({ optionId: v.pollOptionId }));
  }

  async getScheduledPosts(userId: number) {
    return this.prisma.post.findMany({
      where: {
        authorId: userId,
        isPublished: false,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      include: {
        author: { select: userSelect },
        poll: {
          include: {
            options: true,
          },
        },
      },
    });
  }

  async publishPost(userId: number, postId: number) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, authorId: userId, isPublished: false },
    });
    
    if (!post) {
      throw new NotFoundException('Отложенный пост не найден или у вас нет прав.');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { isPublished: true, scheduledAt: null, createdAt: new Date() },
      include: { author: { select: userSelect }, poll: { include: { options: true } } },
    });

    this.eventsGateway.server.to(`profile_room_${userId}`).emit('profile_posts_updated');
    return updatedPost;
  }
}