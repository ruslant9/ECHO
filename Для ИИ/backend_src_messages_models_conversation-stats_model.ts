import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ConversationStatsDay {
  @Field()
  date: string; // YYYY-MM-DD

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  sent: number;

  @Field(() => Int)
  received: number;
}

@ObjectType()
export class ConversationStats {
  @Field(() => Int)
  totalMessages: number;

  @Field(() => Int)
  sentCount: number;

  @Field(() => Int)
  receivedCount: number;

  @Field(() => Int)
  totalReactions: number;

  @Field(() => Int)
  sentReactions: number;

  @Field(() => Int)
  receivedReactions: number;

  @Field(() => Int)
  pinnedMessagesCount: number;

  @Field({ nullable: true })
  firstMessageAt?: Date;

  @Field({ nullable: true })
  lastMessageAt?: Date;

  @Field(() => [ConversationStatsDay])
  daily: ConversationStatsDay[];
}

