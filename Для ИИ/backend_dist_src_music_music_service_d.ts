import { PrismaService } from '../prisma.service';
import { CreatePlaylistInput, UpdatePlaylistInput } from './dto/create-playlist.input';
import { CreateArtistInput, CreateAlbumInput, CreateTrackInput } from './dto/admin-music.input';
export declare class MusicService {
    private prisma;
    constructor(prisma: PrismaService);
    getRecommendations(userId: number, skip?: number, take?: number): Promise<any[]>;
    search(query: string, userId: number): Promise<{
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
    recordPlayback(userId: number, trackId: number): Promise<boolean>;
    getMyLibrary(userId: number, skip?: number, take?: number): Promise<any[]>;
    getRecentHistory(userId: number, skip?: number, take?: number): Promise<any[]>;
    toggleLike(userId: number, trackId: number): Promise<boolean>;
    private mapTracks;
    createPlaylist(userId: number, input: CreatePlaylistInput): Promise<{
        tracks: any[];
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        ownerId: number;
        isPrivate: boolean;
        coverUrl: string | null;
    }>;
    getMyPlaylists(userId: number): Promise<{
        tracks: any[];
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        ownerId: number;
        isPrivate: boolean;
        coverUrl: string | null;
    }[]>;
    getPlaylist(id: number, userId: number): Promise<{
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
    deletePlaylist(id: number, userId: number): Promise<boolean>;
    updatePlaylist(userId: number, input: UpdatePlaylistInput): Promise<{
        tracks: any[];
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        ownerId: number;
        isPrivate: boolean;
        coverUrl: string | null;
    }>;
    addTrackToPlaylist(userId: number, playlistId: number, trackId: number): Promise<boolean>;
    removeTrackFromPlaylist(userId: number, playlistId: number, trackId: number): Promise<boolean>;
    createArtist(input: CreateArtistInput): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        bio: string | null;
        avatar: string | null;
    }>;
    createAlbum(input: CreateAlbumInput): Promise<{
        id: number;
        createdAt: Date;
        title: string;
        coverUrl: string | null;
        genre: string | null;
        releaseDate: Date | null;
        year: number | null;
        artistId: number;
    }>;
    createTrack(input: CreateTrackInput): Promise<{
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
    searchArtistsForAdmin(query: string): Promise<{
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
    getAlbum(id: number, userId: number): Promise<{
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
    getArtistTopTracks(artistId: number, userId: number): Promise<any[]>;
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
    deleteTrack(id: number): Promise<boolean>;
    deleteAlbum(id: number): Promise<boolean>;
    deleteArtist(id: number): Promise<boolean>;
    updateTrack(input: any): Promise<{
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
    adminUpdateArtist(input: any): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        bio: string | null;
        avatar: string | null;
    }>;
    adminUpdateAlbum(input: any): Promise<{
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
