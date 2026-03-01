import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { Comment } from './comment.model';
import { Poll } from './poll.model';
import { Vibe } from '../../vibes/models/vibe.model';

@ObjectType()
export class Post {
  @Field(() => Int)
  id: number;

  @Field()
  createdAt: Date;
  
  updatedAt: Date;
  authorId: number;
  originalPostId?: number | null;
  repostedById?: number | null;

  @Field({ nullable: true })
  content?: string;

  @Field(() => [String], { nullable: 'itemsAndList' })
  images?: string[];

  @Field(() => User)
  author: User;
  
  @Field(() => Int)
  likesCount: number;

  @Field(() => Vibe, { nullable: true })
  vibe?: Vibe;

  @Field(() => Int)
  repostsCount: number;

  @Field(() => Int)
  commentsCount: number;

  @Field(() => Boolean)
  commentsDisabled: boolean;

  @Field(() => Boolean)
  isPinned: boolean;

  // 👇👇👇 ВСТАВЬТЕ ЭТИ СТРОКИ СЮДА 👇👇👇
  @Field(() => Boolean)
  isPublished: boolean;

  @Field(() => Date, { nullable: true })
  scheduledAt?: Date;
  // 👆👆👆 --------------------------- 👆👆👆

  @Field(() => Post, { nullable: true })
  originalPost?: Post; 
  
  @Field(() => [Comment], { nullable: true })
  comments?: Comment[];

  @Field(() => Boolean, { nullable: true })
  isLikedByUser?: boolean;

  @Field(() => Poll, { nullable: true })
  poll?: Poll;
}