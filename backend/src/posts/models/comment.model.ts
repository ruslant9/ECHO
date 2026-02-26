// backend/src/posts/models/comment.model.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { Post } from './post.model';

@ObjectType()
export class Comment {
  @Field(() => Int)
  id: number;

  @Field()
  content: string;

  @Field()
  createdAt: Date;
  
  // --- ДОБАВЛЕНО для совместимости с Prisma ---
  updatedAt: Date;
  authorId: number;
  postId: number;
  // ------------------------------------------

  @Field(() => User)
  author: User;

  @Field(() => Post)
  post: Post;

  @Field(() => Int, { nullable: true })
  parentId?: number;

  @Field(() => [Comment], { nullable: 'itemsAndList' })
  replies?: Comment[];

  @Field(() => Int)
  likesCount: number;

  @Field(() => Int)
  dislikesCount: number;

  @Field(() => Int)
  score: number;

  @Field({ nullable: true })
  userVote?: string; 
}