import { InputType, Field } from '@nestjs/graphql';
import { CreatePollInput } from './create-poll.input';

@InputType()
export class CreatePostInput {
  @Field({ nullable: true })
  content?: string;

  @Field(() => [String], { nullable: 'itemsAndList' })
  images?: string[];
  
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  commentsDisabled?: boolean;

  @Field(() => CreatePollInput, { nullable: true })
  poll?: CreatePollInput;

  @Field(() => Date, { nullable: true })
  scheduledAt?: Date;
}