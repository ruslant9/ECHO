import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';

@ObjectType()
export class Vibe {
  @Field(() => Int)
  id: number;

  @Field()
  videoUrl: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String])
  hashtags: string[];

  @Field(() => Int)
  likesCount: number;

  @Field(() => Int)
  commentsCount: number;

  @Field(() => Int)
  viewsCount: number;

  // 👇 ДОБАВЬ ЭТУ СТРОКУ 👇
  @Field(() => Int)
  repostsCount: number; 

  @Field()
  createdAt: Date;

  @Field()
  isPrivate: boolean;

  @Field(() => Int)
  authorId: number;

  @Field(() => User)
  author: User;

  @Field(() => Boolean, { nullable: true })
  isLikedByUser?: boolean;
}