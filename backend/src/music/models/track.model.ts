import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Artist {
  @Field(() => Int) id: number;
  @Field() name: string;
  @Field({ nullable: true }) avatar?: string;
}

@ObjectType()
export class Track {
  @Field(() => Int) id: number;
  @Field() title: string;
  @Field() url: string;
  @Field(() => Int) duration: number;
  @Field({ nullable: true }) coverUrl?: string;
  @Field(() => Artist) artist: Artist;
  @Field(() => Boolean) isLiked: boolean;
}