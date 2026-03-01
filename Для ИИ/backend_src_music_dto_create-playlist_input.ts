import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreatePlaylistInput {
  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  coverUrl?: string;

  @Field({ defaultValue: false })
  isPrivate?: boolean;
}

@InputType()
export class UpdatePlaylistInput {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  coverUrl?: string;
}