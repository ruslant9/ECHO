import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Conversation } from './conversation.model';
import { User } from '../../users/models/user.model';

@ObjectType()
export class InviteLink {
  @Field(() => Int)
  id: number;

  @Field()
  code: string;

  @Field(() => Int)
  conversationId: number;

  @Field(() => Conversation)
  conversation: Conversation;

  @Field(() => Int)
  creatorId: number;

  @Field(() => User)
  creator: User;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field(() => Int, { nullable: true })
  usageLimit?: number;

  @Field(() => Int)
  usedCount: number;
}