import { User } from '../../users/models/user.model';
import { Comment } from './comment.model';
import { Poll } from './poll.model';
import { Vibe } from '../../vibes/models/vibe.model';
export declare class Post {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    authorId: number;
    originalPostId?: number | null;
    repostedById?: number | null;
    content?: string;
    images?: string[];
    author: User;
    likesCount: number;
    vibe?: Vibe;
    repostsCount: number;
    commentsCount: number;
    commentsDisabled: boolean;
    isPinned: boolean;
    isPublished: boolean;
    scheduledAt?: Date;
    originalPost?: Post;
    comments?: Comment[];
    isLikedByUser?: boolean;
    poll?: Poll;
}
