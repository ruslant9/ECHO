// backend/src/messages/models/conversation.model.ts
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { Message } from './message.model';
import { ConversationType } from '@prisma/client';

registerEnumType(ConversationType, {
  name: 'ConversationType',
});

@ObjectType()
export class Conversation {
  @Field(() => Int)
  id: number;

  @Field(() => User, { nullable: true })
  participant: User;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field(() => Boolean, { nullable: true })
  isAnonymous?: boolean; 

  @Field(() => Int, { nullable: true })
  viewsCount?: number;

  @Field()
  isGroup: boolean;

  @Field(() => ConversationType)
  type: ConversationType;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  myRole?: string;

  @Field()
  hasLeft: boolean;

  @Field(() => Int)
  participantsCount: number;

  @Field(() => Message, { nullable: true })
  lastMessage?: Message;

  @Field(() => Int)
  unreadCount: number;

  @Field()
  isArchived: boolean;

  @Field()
  isManuallyUnread: boolean;

  @Field()
  isPinned: boolean;

  // 👇 ДОБАВЛЯЕМ ВОТ ЭТО ПОЛЕ 👇
  @Field(() => Int, { nullable: true })
  pinOrder?: number;
  // 👆------------------------👆
  
  @Field({ nullable: true })
  mutedUntil?: Date;

  @Field()
  updatedAt: Date;
}