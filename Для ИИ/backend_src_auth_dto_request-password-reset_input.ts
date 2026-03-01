import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RequestPasswordResetInput {
  @Field()
  email: string;
}