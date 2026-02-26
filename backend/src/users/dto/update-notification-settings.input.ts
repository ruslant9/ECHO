import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateNotificationSettingsInput {
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