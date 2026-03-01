// backend/src/posts/models/poll-option.model.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class PollOption {
  @Field(() => Int)
  id: number;

  @Field()
  text: string;

  @Field(() => Int)
  pollId: number;
  
  // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
  // Добавьте '?' чтобы сделать поле опциональным для TypeScript.
  // Это решит ошибку, так как это поле вычисляется позже через ResolveField.
  @Field(() => Int)
  votesCount?: number;
}