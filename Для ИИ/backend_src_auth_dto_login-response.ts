import { Field, ObjectType, Int } from '@nestjs/graphql'; // <--- ДОБАВЬТЕ Int СЮДА
import { User } from '../../users/models/user.model';

@ObjectType()
export class LoginResponse {
  @Field({ nullable: true })
  access_token?: string;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field({ nullable: true })
  emailSent?: boolean;

  @Field(() => Int, { nullable: true }) // Теперь Int будет распознан
  userId?: number;
}