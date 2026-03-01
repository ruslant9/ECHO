import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ResetPasswordInput {
  @Field()
  email: string;

  @Field()
  code: string;

  @Field()
  newPassword: string;
}