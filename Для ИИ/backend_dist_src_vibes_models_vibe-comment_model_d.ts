import { User } from '../../users/models/user.model';
import { Vibe } from './vibe.model';
export declare class VibeComment {
    id: number;
    content: string;
    createdAt: Date;
    vibeId: number;
    vibe?: Vibe;
    authorId: number;
    author: User;
}
