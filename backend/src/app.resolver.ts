import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class AppResolver {
  @Query(() => String) // Объявляем, что это GraphQL запрос, возвращающий строку
  sayHello(): string {
    return 'Hello from GraphQL!';
  }
}