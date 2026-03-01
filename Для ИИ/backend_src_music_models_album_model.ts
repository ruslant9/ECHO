// backend/src/music/models/album.model.ts

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Artist, Track } from './track.model'; // убедитесь в правильности импорта

@ObjectType()
export class Album {
  @Field(() => Int)
  id: number;

  @Field()
  title: string;

  @Field({ nullable: true })
  coverUrl?: string;

  @Field({ nullable: true })
  genre?: string;

  @Field({ nullable: true })
  year?: number;

  @Field({ nullable: true })
  releaseDate?: Date;

  @Field(() => Artist)
  artist: Artist;

  // ДОБАВЬТЕ ЭТО ПОЛЕ:
  @Field(() => [Artist], { nullable: 'itemsAndList' })
  featuredArtists?: Artist[];

  @Field(() => [Track], { nullable: true })
  tracks?: Track[];
}