import { User } from '../../users/models/user.model';
export declare class Vibe {
    id: number;
    videoUrl: string;
    description?: string;
    hashtags: string[];
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
    repostsCount: number;
    createdAt: Date;
    isPrivate: boolean;
    authorId: number;
    author: User;
    isLikedByUser?: boolean;
}
