import { Artist, Track } from './track.model';
export declare class Album {
    id: number;
    title: string;
    coverUrl?: string;
    genre?: string;
    year?: number;
    releaseDate?: Date;
    artist: Artist;
    featuredArtists?: Artist[];
    tracks?: Track[];
}
