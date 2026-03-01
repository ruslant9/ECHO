import { User } from '../../users/models/user.model';
import { Post } from './post.model';
export declare class Comment {
    id: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: number;
    postId: number;
    author: User;
    post: Post;
    parentId?: number;
    replies?: Comment[];
    likesCount: number;
    dislikesCount: number;
    score: number;
    userVote?: string;
}
