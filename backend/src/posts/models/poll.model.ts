import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PollOption } from './poll-option.model';

@ObjectType()
export class Poll {
  @Field(() => Int)
  id: number;

  @Field()
  question: string;

  @Field()
  endDate: Date;

  @Field()
  isAnonymous: boolean;

  @Field()
  allowMultipleVotes: boolean;

  @Field(() => [PollOption])
  options: PollOption[];

  @Field(() => Int)
  postId: number; // Для обратной связи с Post

  @Field() // <--- НОВОЕ
  allowRevote: boolean;
}