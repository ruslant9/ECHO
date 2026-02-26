import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../users/models/user.model';

@ObjectType()
export class Notification {
  @Field(() => Int)
  id: number;

  @Field()
  type: string;

  @Field()
  message: string;

  @Field()
  isRead: boolean;

  @Field()
  createdAt: Date;

  @Field(() => User, { nullable: true })
  initiator?: User;

  @Field(() => Int, { nullable: true })
  postId?: number;

  @Field(() => Int, { nullable: true })
  commentId?: number;

  @Field({ nullable: true })
  imageUrl?: string;

  // НОВЫЕ ПОЛЯ
  @Field(() => Int, { nullable: true })
  vibeId?: number;

  @Field(() => Int, { nullable: true })
  vibeCommentId?: number;
}