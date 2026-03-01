// backend/src/users/models/notification-settings.model.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class NotificationSettingsModel {
  @Field(() => Int, { nullable: true }) // ID может быть null, если настройки ещё не существуют
  id?: number;

  @Field(() => Int)
  userId: number;

  @Field(() => Date, { nullable: true })
  muteAllUntil?: Date;

  @Field(() => Boolean, { nullable: true })
  notifyOnLikes?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnComments?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnReposts?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnMessages?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnFriendRequests?: boolean;

  @Field({ nullable: true })
  notificationSound?: string;
}