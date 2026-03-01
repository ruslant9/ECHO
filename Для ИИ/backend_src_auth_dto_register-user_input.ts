// backend/src/auth/dto/register-user.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RegisterUserInput {
  @Field()
  email: string;

  @Field()
  username: string;

  @Field()
  password: string;

  // --- ДОБАВЛЕНО ---
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  gender?: string;
  // -----------------
}