import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreatePollOptionInput {
  @Field()
  text: string;
}