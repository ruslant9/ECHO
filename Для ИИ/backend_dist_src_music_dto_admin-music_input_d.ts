export declare class CreateArtistInput {
    name: string;
    bio?: string;
    avatar?: string;
}
export declare class CreateAlbumInput {
    title: string;
    artistId: number;
    coverUrl?: string;
    genre?: string;
    releaseDate?: Date;
    year?: number;
}
export declare class CreateTrackInput {
    title: string;
    url: string;
    duration: number;
    artistId: number;
    albumId?: number;
    coverUrl?: string;
    genre?: string;
    releaseDate?: Date;
    featuredArtistIds?: number[];
    trackNumber?: number;
}
declare const UpdateTrackInput_base: import("@nestjs/common").Type<Partial<CreateTrackInput>>;
export declare class UpdateTrackInput extends UpdateTrackInput_base {
    id: number;
}
declare const UpdateAlbumInput_base: import("@nestjs/common").Type<Partial<CreateAlbumInput>>;
export declare class UpdateAlbumInput extends UpdateAlbumInput_base {
    id: number;
    trackIds?: number[];
}
declare const UpdateArtistInput_base: import("@nestjs/common").Type<Partial<CreateArtistInput>>;
export declare class UpdateArtistInput extends UpdateArtistInput_base {
    id: number;
}
export {};
