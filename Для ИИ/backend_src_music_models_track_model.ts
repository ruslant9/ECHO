import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Album } from './album.model';

@ObjectType()
export class Artist {
  @Field(() => Int) id: number;
  @Field() name: string;
  @Field({ nullable: true }) bio?: string;
  @Field({ nullable: true }) avatar?: string;

  // ДОБАВИТЬ ЭТИ ПОЛЯ:
  @Field(() => [Album], { nullable: true })
  albums?: Album[];

  @Field(() => [Album], { nullable: true })
  featuredInAlbums?: Album[];
}

@ObjectType()
export class Track {
  @Field(() => Int) id: number;
  @Field() title: string;
  @Field() url: string;
  @Field(() => Int) duration: number;
  @Field({ nullable: true }) coverUrl?: string;
  @Field({ nullable: true }) genre?: string;
  @Field({ nullable: true }) releaseDate?: Date;

  @Field(() => Artist) artist: Artist;

  // ДОБАВИТЬ ЭТО ПОЛЕ:
  @Field(() => [Artist], { nullable: 'itemsAndList' })
  featuredArtists?: Artist[];

  @Field(() => Album, { nullable: true }) album?: Album;
  @Field(() => Boolean) isLiked: boolean;
}