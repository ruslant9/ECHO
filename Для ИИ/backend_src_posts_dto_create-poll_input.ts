import { InputType, Field } from '@nestjs/graphql';
import { CreatePollOptionInput } from './create-poll-option.input';

@InputType()
export class CreatePollInput {
  @Field()
  question: string;

  @Field(() => [CreatePollOptionInput])
  options: CreatePollOptionInput[];

  @Field()
  endDate: Date;

  @Field({ defaultValue: false })
  isAnonymous: boolean;

  @Field({ defaultValue: false })
  allowMultipleVotes: boolean;

  @Field({ defaultValue: true }) // <--- НОВОЕ
  allowRevote: boolean;
}