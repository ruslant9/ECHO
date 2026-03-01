import { Post } from './post.model';
import { Comment } from './comment.model';
import { User } from '../../users/models/user.model';
export declare class FeedItem {
    type: string;
    post?: Post;
    comment?: Comment;
    users?: User[];
}
