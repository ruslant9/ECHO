import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Track } from './track.model';
import { User } from '../../users/models/user.model';

@ObjectType()
export class Playlist {
  @Field(() => Int)
  id: number;

  @Field()
  title: string;

  @Field({ nullable: true })
  coverUrl?: string;

  @Field(() => User)
  owner: User;
  
  @Field(() => [Track], { nullable: true })
  tracks?: Track[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}