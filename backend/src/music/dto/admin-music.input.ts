// backend/src/music/dto/admin-music.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateArtistInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  avatar?: string;
}

@InputType()
export class CreateAlbumInput {
  @Field()
  title: string;

  @Field(() => Int)
  artistId: number;

  @Field({ nullable: true })
  coverUrl?: string;

  @Field({ nullable: true })
  genre?: string;

  @Field({ nullable: true })
  releaseDate?: Date;

  @Field(() => Int, { nullable: true })
  year?: number;
}

@InputType()
export class CreateTrackInput {
  @Field()
  title: string;

  @Field()
  url: string;

  @Field(() => Int)
  duration: number; // длительность в секундах

  @Field(() => Int)
  artistId: number;

  @Field(() => Int, { nullable: true })
  albumId?: number;

  @Field({ nullable: true })
  coverUrl?: string;

  @Field({ nullable: true })
  genre?: string;

  @Field({ nullable: true })
  releaseDate?: Date;

  @Field(() => [Int], { nullable: 'itemsAndList' })
  featuredArtistIds?: number[];
}