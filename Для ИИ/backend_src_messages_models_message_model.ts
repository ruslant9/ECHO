import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';

@ObjectType()
export class MessageReaction {
  @Field(() => Int)
  id: number;

  @Field()
  emoji: string;

  @Field(() => Int)
  userId: number;

  @Field(() => User)
  user: User;
}

@ObjectType()
export class ReplyContext {
  @Field(() => Int)
  id: number;

  @Field()
  content: string;

  @Field(() => [String], { nullable: true, description: 'Список URL изображений, прикреплённых к сообщению' })
  images?: string[];

  @Field(() => User)
  sender: User;
}


@ObjectType()
export class SystemMessageMention {
  @Field(() => Int)
  userId: number;

  @Field()
  name: string;
}

@ObjectType()
export class MessageReadBy {
  @Field(() => User)
  user: User;

  @Field()
  readAt: Date;
}

@ObjectType()
export class Message {
  @Field(() => Int)
  id: number;

  @Field()
  content: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true, description: 'Дата редактирования текста (не закрепления)' })
  editedAt?: Date | null;

  @Field(() => Int)
  senderId: number;

  @Field(() => [String], { nullable: true, description: 'Список URL изображений' })
  images?: string[];


  @Field(() => Int)
  conversationId: number;

  @Field(() => User)
  sender: User;

  @Field()
  isRead: boolean;

  @Field()
  isPinned: boolean;

  @Field()
  type: string;

  @Field(() => [SystemMessageMention], { nullable: true, description: 'Упоминания пользователей в системном сообщении (для кликабельных имён)' })
  systemMessageMentions?: SystemMessageMention[];

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isAnonymous?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  viewsCount?: number;
  
  @Field(() => User, { nullable: true })
  forwardedFrom?: User;

  @Field(() => ReplyContext, { nullable: true })
  replyTo?: ReplyContext;

  @Field(() => [MessageReaction], { nullable: true })
  reactions?: MessageReaction[];

  @Field(() => [MessageReadBy], { nullable: true, description: 'Кто прочитал сообщение (для тултипа «Прочитано»)' })
  readBy?: MessageReadBy[];
}