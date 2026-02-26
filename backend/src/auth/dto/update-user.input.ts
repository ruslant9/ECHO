// backend/src/users/dto/update-user.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  username?: string;

 @Field({ nullable: true }) // <--- ДОБАВИТЬ
  name?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  banner?: string;

  @Field({ nullable: true })
  website?: string; // <-- Добавили
}