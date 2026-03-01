import { Album } from './album.model';
export declare class Artist {
    id: number;
    name: string;
    bio?: string;
    avatar?: string;
    albums?: Album[];
    featuredInAlbums?: Album[];
}
export declare class Track {
    id: number;
    title: string;
    url: string;
    duration: number;
    coverUrl?: string;
    genre?: string;
    releaseDate?: Date;
    artist: Artist;
    featuredArtists?: Artist[];
    album?: Album;
    isLiked: boolean;
}
