import { Track, Artist } from './track.model';
import { Album } from './album.model';
import { Playlist } from './playlist.model';
export declare class SearchResults {
    tracks: Track[];
    artists: Artist[];
    albums: Album[];
    playlists: Playlist[];
}
