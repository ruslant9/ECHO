import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({ description: 'Участник беседы (пользователь + роль в беседе)' })
export class ConversationParticipantUser {
  @Field(() => Int)
  id: number;

  @Field()
  username: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ description: 'Роль в беседе: ADMIN или MEMBER' })
  role: string;

  @Field({ description: 'Статус онлайн' })
  isOnline: boolean;

  @Field({ nullable: true, description: 'Время последнего захода (когда не в сети)' })
  lastOnlineAt?: Date;
}
