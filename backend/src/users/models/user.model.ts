// backend/src/users/models/user.model.ts
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Post } from '../../posts/models/post.model';
import { Comment } from '../../posts/models/comment.model';
import { Vibe } from '../../vibes/models/vibe.model'; // <-- Импортируем модель Vibe

@ObjectType()
export class User {
  @Field(() => Int)
  id: number;

  @Field()
  username: string;

  @Field({ nullable: true })
  name?: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  password?: string;

  @Field()
  isOnline: boolean;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  banner?: string;

  @Field({ nullable: true })
  website?: string;

  @Field()
  createdAt: Date; 
  
  @Field({ nullable: true })
  lastOnlineAt?: Date;

  @Field(() => Int, { nullable: true })
  postsCount?: number;

  @Field(() => Int, { nullable: true })
  friendsCount?: number;

  @Field(() => Int, { nullable: true })
  subscriptionsCount?: number;
  
  @Field(() => Int, { nullable: true })
  followersCount?: number;

  // 👇 ДОБАВЛЯЕМ ПОЛЕ ДЛЯ ВАЙБОВ 👇
  @Field(() => [Vibe], { nullable: true })
  vibes?: Vibe[];
  // 👆 ---------------------- 👆
  
  @Field(() => [User], { nullable: true })
  friends?: User[];

  @Field(() => [User], { nullable: true })
  subscriptions?: User[];

  @Field(() => [User], { nullable: true })
  followers?: User[];

  @Field(() => String, { nullable: true, description: 'Статус дружбы относительно смотрящего юзера (FRIEND, REQUEST_SENT, REQUEST_RECEIVED, NONE)' })
  friendshipStatus?: string;

  @Field(() => Int, { nullable: true, description: 'ID исходящей заявки в друзья (если есть)' })
  sentFriendRequestId?: number;

  @Field(() => Int, { nullable: true, description: 'ID входящей заявки в друзья (если есть)' })
  receivedFriendRequestId?: number;

  @Field(() => [Vibe], { nullable: true })
  likedVibes?: Vibe[];
  
  @Field(() => [Post], { nullable: true })
  likedPosts?: Post[];

  @Field(() => [Comment], { nullable: true })
  likedComments?: Comment[];

  @Field(() => Boolean)
  isAdmin: boolean;

  @Field(() => Boolean, { nullable: true })
  amIBlocked?: boolean;

  @Field(() => Boolean, { nullable: true })
  isBlockedByMe?: boolean;
}