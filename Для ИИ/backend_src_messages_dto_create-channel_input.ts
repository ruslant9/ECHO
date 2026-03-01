import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateChannelInput {
  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  avatar?: string;
}