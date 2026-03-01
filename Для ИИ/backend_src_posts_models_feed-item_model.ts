// backend/src/posts/models/feed-item.model.ts
import { ObjectType, Field } from '@nestjs/graphql';
import { Post } from './post.model';
import { Comment } from './comment.model';
import { User } from '../../users/models/user.model';

@ObjectType()
export class FeedItem {
  @Field()
  type: string; // 'TOP_POST' | 'FRIEND_POST' | 'POPULAR_COMMENT' | 'USER_CAROUSEL' | 'STRANGER_POST'

  @Field(() => Post, { nullable: true })
  post?: Post;

  @Field(() => Comment, { nullable: true })
  comment?: Comment;

  @Field(() => [User], { nullable: true })
  users?: User[];
}