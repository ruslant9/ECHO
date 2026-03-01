import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreatePostInput {
  @Field({ nullable: true })
  content?: string;

  @Field(() => [String], { nullable: 'itemsAndList' })
  images?: string[];
}