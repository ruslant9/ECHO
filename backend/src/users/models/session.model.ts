import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Session {
  @Field(() => Int)
  id!: number;

  @Field()
  ip!: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  device?: string;

  @Field({ nullable: true })
  os?: string;

  @Field({ nullable: true })
  browser?: string;

  @Field()
  lastActive!: Date;
  
  @Field()
  isCurrent?: boolean; // Поле, которое мы вычислим "на лету"
}