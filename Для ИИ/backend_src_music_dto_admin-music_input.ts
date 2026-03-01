import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

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
  duration: number;

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

  @Field(() => Int, { nullable: true }) trackNumber?: number;
}

@InputType()
export class UpdateTrackInput extends PartialType(CreateTrackInput) {
  @Field(() => Int)
  id: number;
}

@InputType()
export class UpdateAlbumInput extends PartialType(CreateAlbumInput) {
  @Field(() => Int)
  id: number;

  @Field(() => [Int], { nullable: 'itemsAndList' })
  trackIds?: number[];
}

@InputType()
export class UpdateArtistInput extends PartialType(CreateArtistInput) {
  @Field(() => Int)
  id: number;
}