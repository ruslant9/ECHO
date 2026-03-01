import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateInviteInput {
  @Field(() => Int)
  conversationId: number;

  @Field(() => Int, { nullable: true })
  usageLimit?: number;

  @Field(() => Int, { nullable: true })
  expiresInMinutes?: number;
}