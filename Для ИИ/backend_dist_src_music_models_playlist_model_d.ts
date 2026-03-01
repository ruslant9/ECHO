import { Track } from './track.model';
import { User } from '../../users/models/user.model';
export declare class Playlist {
    id: number;
    title: string;
    coverUrl?: string;
    owner: User;
    tracks?: Track[];
    createdAt: Date;
    updatedAt: Date;
}
