import { ObjectType, Field } from '@nestjs/graphql';
import { Track, Artist } from './track.model';
import { Album } from './album.model';
import { Playlist } from './playlist.model';

@ObjectType()
export class SearchResults {
  @Field(() => [Track])
  tracks: Track[];

  @Field(() => [Artist])
  artists: Artist[];

  @Field(() => [Album])
  albums: Album[];

  @Field(() => [Playlist])
  playlists: Playlist[];
}