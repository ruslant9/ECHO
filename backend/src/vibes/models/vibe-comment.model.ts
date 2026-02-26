import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { Vibe } from './vibe.model';

@ObjectType()
export class VibeComment {
  @Field(() => Int)
  id: number;

  @Field()
  content: string;

  @Field()
  createdAt: Date;

  @Field(() => Int)
  vibeId: number;

  @Field(() => Vibe, { nullable: true })
  vibe?: Vibe;

  // --- ДОБАВИТЬ ЭТО ---
  @Field(() => Int)
  authorId: number;
  // -------------------

  @Field(() => User)
  author: User;
}