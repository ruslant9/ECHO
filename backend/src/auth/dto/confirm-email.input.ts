import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class ConfirmEmailInput {
  @Field(() => Int)
  userId: number;

  @Field()
  code: string;
}