import { MusicService } from './music.service';
import { CreatePlaylistInput, UpdatePlaylistInput } from './dto/create-playlist.input';
import { CreateArtistInput, CreateAlbumInput, CreateTrackInput, UpdateTrackInput, UpdateArtistInput, UpdateAlbumInput } from './dto/admin-music.input';
export declare class MusicResolver {
    private readonly musicService;
    constructor(musicService: MusicService);
    musicRecommendations(ctx: any, skip: number, take: number): Promise<any[]>;
    searchMusic(ctx: any, query: string): Promise<{
        tracks: any[];
        artists: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        }[];
        albums: ({
            artist: {
                id: number;
                name: string;
                createdAt: Date;
                bio: string | null;
                avatar: string | null;
            };
        } & {
            id: number;
            createdAt: Date;
            title: string;
            coverUrl: string | null;
            genre: string | null;
            releaseDate: Date | null;
            year: number | null;
            artistId: number;
        })[];
        playlists: ({
            owner: {
                id: number;
                email: string;
                username: string;
                name: string | null;
                password: string;
                isOnline: boolean;
                lastOnlineAt: Date | null;
                isAdmin: boolean;
                isVerified: boolean;
                createdAt: Date;
                bio: string | null;
                location: string | null;
                gender: string | null;
                website: string | null;
                avatar: string | null;
                banner: string | null;
            };
            tracks: ({
                track: {
                    url: string;
                    id: number;
                    createdAt: Date;
                    title: string;
                    coverUrl: string | null;
                    genre: string | null;
                    releaseDate: Date | null;
                    artistId: number;
                    duration: number;
                    trackNumber: number | null;
                    albumId: number | null;
                };
            } & {
                trackId: number;
                addedAt: Date;
                playlistId: number;
            })[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            ownerId: number;
            isPrivate: boolean;
            coverUrl: string | null;
        })[];
    }>;
    myMusicLibrary(ctx: any): Promise<any[]>;
    toggleTrackLike(ctx: any, trackId: number): Promise<boolean>;
    recordPlayback(ctx: any, trackId: number): Promise<boolean>;
    myRecentHistory(ctx: any): Promise<any[]>;
    myPlaylists(ctx: any): Promise<{
        tracks: any[];
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        ownerId: number;
        isPrivate: boolean;
        coverUrl: string | null;
    }[]>;
    playlist(ctx: any, id: number): Promise<{
        tracks: any[];
        owner: {
            id: number;
            email: string;
            username: string;
            name: string | null;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date | null;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string | null;
            location: string | null;
            gender: string | null;
            website: string | null;
            avatar: string | null;
            banner: string | null;
        };
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        ownerId: number;
        isPrivate: boolean;
        coverUrl: string | null;
    }>;
    createPlaylist(ctx: any, input: CreatePlaylistInput): Promise<{
        tracks: any[];
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        ownerId: number;
        isPrivate: boolean;
        coverUrl: string | null;
    }>;
    deletePlaylist(ctx: any, id: number): Promise<boolean>;
    updatePlaylist(ctx: any, input: UpdatePlaylistInput): Promise<{
        tracks: any[];
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        ownerId: number;
        isPrivate: boolean;
        coverUrl: string | null;
    }>;
    addTrackToPlaylist(ctx: any, playlistId: number, trackId: number): Promise<boolean>;
    removeTrackFromPlaylist(ctx: any, playlistId: number, trackId: number): Promise<boolean>;
    createArtistAdmin(input: CreateArtistInput): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        bio: string | null;
        avatar: string | null;
    }>;
    createAlbumAdmin(input: CreateAlbumInput): Promise<boolean>;
    createTrackAdmin(input: CreateTrackInput): Promise<{
        artist: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        };
        album: {
            id: number;
            createdAt: Date;
            title: string;
            coverUrl: string | null;
            genre: string | null;
            releaseDate: Date | null;
            year: number | null;
            artistId: number;
        };
        featuredArtists: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        }[];
    } & {
        url: string;
        id: number;
        createdAt: Date;
        title: string;
        coverUrl: string | null;
        genre: string | null;
        releaseDate: Date | null;
        artistId: number;
        duration: number;
        trackNumber: number | null;
        albumId: number | null;
    }>;
    searchArtistsAdmin(query: string): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        bio: string | null;
        avatar: string | null;
    }[]>;
    getArtist(id: number): Promise<{
        albums: ({
            tracks: {
                id: number;
            }[];
        } & {
            id: number;
            createdAt: Date;
            title: string;
            coverUrl: string | null;
            genre: string | null;
            releaseDate: Date | null;
            year: number | null;
            artistId: number;
        })[];
        featuredInAlbums: ({
            tracks: {
                id: number;
            }[];
        } & {
            id: number;
            createdAt: Date;
            title: string;
            coverUrl: string | null;
            genre: string | null;
            releaseDate: Date | null;
            year: number | null;
            artistId: number;
        })[];
    } & {
        id: number;
        name: string;
        createdAt: Date;
        bio: string | null;
        avatar: string | null;
    }>;
    getAlbum(ctx: any, id: number): Promise<{
        tracks: any[];
        artist: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        };
        featuredArtists: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        }[];
        id: number;
        createdAt: Date;
        title: string;
        coverUrl: string | null;
        genre: string | null;
        releaseDate: Date | null;
        year: number | null;
        artistId: number;
    }>;
    getArtistTopTracks(ctx: any, artistId: number): Promise<any[]>;
    getArtistAlbums(artistId: number): Promise<({
        artist: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        title: string;
        coverUrl: string | null;
        genre: string | null;
        releaseDate: Date | null;
        year: number | null;
        artistId: number;
    })[]>;
    adminDeleteAllArtists(): Promise<boolean>;
    adminGetAllTracks(query?: string, skip?: number): Promise<({
        artist: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        };
        album: {
            id: number;
            createdAt: Date;
            title: string;
            coverUrl: string | null;
            genre: string | null;
            releaseDate: Date | null;
            year: number | null;
            artistId: number;
        };
        featuredArtists: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        }[];
    } & {
        url: string;
        id: number;
        createdAt: Date;
        title: string;
        coverUrl: string | null;
        genre: string | null;
        releaseDate: Date | null;
        artistId: number;
        duration: number;
        trackNumber: number | null;
        albumId: number | null;
    })[]>;
    adminGetAllAlbums(query?: string, skip?: number): Promise<({
        artist: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        title: string;
        coverUrl: string | null;
        genre: string | null;
        releaseDate: Date | null;
        year: number | null;
        artistId: number;
    })[]>;
    adminGetAllArtists(query?: string, skip?: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        bio: string | null;
        avatar: string | null;
    }[]>;
    adminDeleteTrack(id: number): Promise<boolean>;
    adminDeleteAlbum(id: number): Promise<boolean>;
    adminDeleteArtist(id: number): Promise<boolean>;
    adminUpdateTrack(input: UpdateTrackInput): Promise<{
        artist: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        };
        album: {
            id: number;
            createdAt: Date;
            title: string;
            coverUrl: string | null;
            genre: string | null;
            releaseDate: Date | null;
            year: number | null;
            artistId: number;
        };
    } & {
        url: string;
        id: number;
        createdAt: Date;
        title: string;
        coverUrl: string | null;
        genre: string | null;
        releaseDate: Date | null;
        artistId: number;
        duration: number;
        trackNumber: number | null;
        albumId: number | null;
    }>;
    adminUpdateArtist(input: UpdateArtistInput): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        bio: string | null;
        avatar: string | null;
    }>;
    adminUpdateAlbum(input: UpdateAlbumInput): Promise<{
        artist: {
            id: number;
            name: string;
            createdAt: Date;
            bio: string | null;
            avatar: string | null;
        };
        tracks: {
            url: string;
            id: number;
            createdAt: Date;
            title: string;
            coverUrl: string | null;
            genre: string | null;
            releaseDate: Date | null;
            artistId: number;
            duration: number;
            trackNumber: number | null;
            albumId: number | null;
        }[];
    } & {
        id: number;
        createdAt: Date;
        title: string;
        coverUrl: string | null;
        genre: string | null;
        releaseDate: Date | null;
        year: number | null;
        artistId: number;
    }>;
}
