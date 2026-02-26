import { Resolver, Query, Mutation, Args, Int, Context, ResolveField, Parent } from '@nestjs/graphql';
import { ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Post } from './models/post.model';
import { Comment } from './models/comment.model';
import { PostsService } from './posts.service';
import { CommentsService } from './comments.service';
import { CreatePostInput } from './dto/create-post.input';
import { VoteType } from '@prisma/client';
import { JwtAuthGuardOptional } from '../auth/jwt-auth-optional.guard';
import { User } from '../users/models/user.model';
import { UpdatePostInput } from './dto/update-post.input';
import { Poll } from './models/poll.model';
import { PollOption } from './models/poll-option.model';
import { FeedItem } from './models/feed-item.model';

@ObjectType()
class UserPollVoteOutput {
  @Field(() => Int)
  optionId: number;
}

@ObjectType()
class PollVoterOutput {
  @Field(() => Int)
  optionId: number;

  @Field(() => User)
  user: User;
}

@Resolver(() => Post)
export class PostsResolver {
  constructor(
    private postsService: PostsService,
    private commentsService: CommentsService,
  ) {}
  
  @ResolveField(() => Poll, { nullable: true })
  async poll(@Parent() post: Post) {
    if (!post.id) {
      return null;
    }
    const poll = await this.postsService['prisma'].poll.findUnique({
      where: { postId: post.id },
      include: { 
        options: {
          include: { votes: true },
        },
      },
    });

    if (!poll) {
        return null;
    }

    const optionsWithCounts = poll.options.map(option => ({
        ...option,
        votesCount: option.votes.length,
    }));
    
    return { ...poll, options: optionsWithCounts };
  }

  @Resolver(() => PollOption)
  async votesCount(@Parent() pollOption: PollOption) {
    if (!pollOption.id) {
        return 0;
    }
    return this.postsService['prisma'].pollVote.count({
        where: { pollOptionId: pollOption.id },
    });
  }

  @Query(() => [User])
  async getPostLikes(@Args('postId', { type: () => Int }) postId: number) {
    return this.postsService.getPostLikes(postId);
  }

  @Query(() => [User])
  async getCommentLikes(@Args('commentId', { type: () => Int }) commentId: number) {
    return this.commentsService.getCommentLikes(commentId);
  }

  @Query(() => [Post], { name: 'posts' })
  findAllPosts(@Args('sort', { type: () => String, nullable: true, defaultValue: 'new' }) sort: 'new' | 'popular') {
    return this.postsService.findAll(sort);
  }

  @Query(() => Post, { name: 'post' })
  @UseGuards(JwtAuthGuardOptional)
  findOnePost(
    @Args('id', { type: () => Int }) id: number,
    @Context() context,
  ) {
    const viewerId = context.req?.user?.userId;
    return this.postsService.findOne(id, viewerId);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  createPost(@Args('createPostInput') createPostInput: CreatePostInput, @Context() context) {
    return this.postsService.create(context.req.user.userId, createPostInput);
  }

  @Query(() => [Post], { name: 'myScheduledPosts' })
@UseGuards(JwtAuthGuard)
async myScheduledPosts(@Context() context) { // <-- Добавлено async
  const userId = context.req.user.userId;
  const posts = await this.postsService.getScheduledPosts(userId);

  // Добавляем статус isLikedByUser к каждому посту
  const postsWithLikeStatus = await Promise.all(
    posts.map(async (post) => {
      const like = await this.postsService['prisma'].postLike.findUnique({
        where: {
          postId_userId: {
            postId: post.id,
            userId: userId,
          },
        },
      });
      return { ...post, isLikedByUser: !!like };
    })
  );
  
  return postsWithLikeStatus;
}

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  publishPostNow(
    @Args('postId', { type: () => Int }) postId: number,
    @Context() context,
  ) {
    return this.postsService.publishPost(context.req.user.userId, postId);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  togglePostLike(@Args('postId', { type: () => Int }) postId: number, @Context() context) {
    return this.postsService.toggleLike(postId, context.req.user.userId);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  updatePost(
    @Args('postId', { type: () => Int }) postId: number,
    @Args('updatePostInput') updatePostInput: UpdatePostInput,
    @Context() context
  ) {
    return this.postsService.update(context.req.user.userId, postId, updatePostInput);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deletePost(@Args('postId', { type: () => Int }) postId: number, @Context() context) {
    this.postsService.delete(postId, context.req.user.userId);
    return true;
  }

  @Query(() => [Comment], { name: 'comments' })
  @UseGuards(JwtAuthGuardOptional)
  findCommentsByPost(
    @Args('postId', { type: () => Int }) postId: number,
    @Args('sort', { type: () => String, nullable: true, defaultValue: 'popular' }) sort: 'new' | 'popular',
    @Context() context,
  ) {
    const userId = context.req?.user?.userId;
    return this.commentsService.findByPostId(postId, sort, userId);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  createComment(
    @Args('postId', { type: () => Int }) postId: number,
    @Args('content', { type: () => String }) content: string,
    @Args('parentId', { type: () => Int, nullable: true }) parentId: number,
    @Context() context,
  ) {
    return this.commentsService.create(context.req.user.userId, postId, content, parentId);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  voteComment(
    @Args('commentId', { type: () => Int }) commentId: number,
    @Args('type', { type: () => String }) type: 'LIKE' | 'DISLIKE',
    @Context() context,
  ) {
    return this.commentsService.vote(context.req.user.userId, commentId, VoteType[type]);
  }

   @Mutation(() => Int)
  @UseGuards(JwtAuthGuard)
  async deleteManyComments(
    @Args('commentIds', { type: () => [Int] }) commentIds: number[],
    @Context() context
  ) {
    return this.commentsService.deleteMany(context.req.user.userId, commentIds);
  }

  @Mutation(() => Int)
  @UseGuards(JwtAuthGuard)
  async clearComments(
    @Args('postId', { type: () => Int }) postId: number,
    @Args('type', { type: () => String }) type: 'ALL' | 'MINE' | 'OTHERS',
    @Context() context
  ) {
    return this.commentsService.clear(context.req.user.userId, postId, type);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Args('commentId', { type: () => Int }) commentId: number,
    @Args('content', { type: () => String }) content: string,
    @Context() context,
  ) {
    return this.commentsService.update(context.req.user.userId, commentId, content);
  }

  @Query(() => [FeedItem])
  @UseGuards(JwtAuthGuard)
  async recommendationFeed(@Context() context) {
    return this.postsService.getRecommendationFeed(context.req.user.userId);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  async repostPost(
    @Args('postId', { type: () => Int }) postId: number,
    @Context() context
  ) {
    return this.postsService.repost(context.req.user.userId, postId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async togglePinPost(
    @Args('postId', { type: () => Int }) postId: number,
    @Context() context
  ) {
    return this.postsService.togglePin(context.req.user.userId, postId);
  }

  @Mutation(() => Int)
  @UseGuards(JwtAuthGuard)
  deleteComment(@Args('commentId', { type: () => Int }) commentId: number, @Context() context) {
    return this.commentsService.delete(context.req.user.userId, commentId);
  }

  @Query(() => [User])
  async getPostReposters(@Args('postId', { type: () => Int }) postId: number) {
    return this.postsService.getPostReposters(postId);
  }

  @Mutation(() => Poll)
  @UseGuards(JwtAuthGuard)
  async togglePollVote(
    @Args('pollId', { type: () => Int }) pollId: number,
    @Args('optionIds', { type: () => [Int] }) optionIds: number[],
    @Context() context
  ) {
    return this.postsService.togglePollVote(context.req.user.userId, pollId, optionIds);
  }

  @Query(() => [UserPollVoteOutput])
  @UseGuards(JwtAuthGuard)
  async getUserPollVotes(
    @Args('pollId', { type: () => Int }) pollId: number,
    @Context() context
  ) {
    return this.postsService.getUserPollVotes(context.req.user.userId, pollId);
  }

  @Query(() => [PollVoterOutput])
  @UseGuards(JwtAuthGuard)
  async getPollVoters(
    @Args('pollId', { type: () => Int }) pollId: number,
    @Context() context
  ) {
    return this.postsService.getPollVoters(context.req.user.userId, pollId);
  }
}