import { Resolver, Query, Mutation, Args, Int, Context, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/models/user.model';

// DTO для ответов
@ObjectType()
class FriendshipOutput {
  @Field(() => Int)
  id: number;
  
  @Field(() => Int)
  score: number;

  @Field(() => User)
  friend: User;
}

@ObjectType()
class FriendRequestOutput {
  @Field(() => Int)
  id: number;

  @Field(() => User)
  sender: User;
}

@ObjectType()
class OutgoingRequestOutput {
  @Field(() => Int)
  id: number;

  @Field(() => User)
  receiver: User;
}

@Resolver()
export class FriendsResolver {
  constructor(private readonly friendsService: FriendsService) {}

  @Query(() => [OutgoingRequestOutput]) // <-- Объявление GraphQL-поля
  @UseGuards(JwtAuthGuard)
  async outgoingRequests(@Context() context) {
    // Вызов соответствующего метода из сервиса
    return this.friendsService.getOutgoingRequests(context.req.user.userId);
  }

  @Mutation(() => Boolean) // Мутация возвращает boolean (успех/неудача)
  @UseGuards(JwtAuthGuard)
  async cancelFriendRequest(@Context() context, @Args('requestId', { type: () => Int }) requestId: number) {
    // Вызывает метод из FriendsService для отмены заявки
    await this.friendsService.cancelRequest(context.req.user.userId, requestId);
    return true; // Возвращает true в случае успеха
  }


  @Query(() => [FriendshipOutput])
  @UseGuards(JwtAuthGuard)
  async myFriends(@Context() context) {
    return this.friendsService.getMyFriends(context.req.user.userId);
  }

  @Query(() => [FriendRequestOutput])
  @UseGuards(JwtAuthGuard)
  async incomingRequests(@Context() context) {
    return this.friendsService.getIncomingRequests(context.req.user.userId);
  }
  
  @Query(() => [User])
  @UseGuards(JwtAuthGuard)
  async searchUsers(
    @Context() context, 
    @Args('query', { type: () => String, nullable: true }) query?: string,
    @Args('city', { type: () => String, nullable: true }) city?: string,
    @Args('gender', { type: () => String, nullable: true }) gender?: string,
    @Args('registeredAfter', { type: () => String, nullable: true }) registeredAfter?: string,
  ) {
      return this.friendsService.searchUsers(
        context.req.user.userId, 
        query, 
        city, 
        gender, 
        registeredAfter
      );
  }


  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async sendFriendRequest(@Context() context, @Args('targetId', { type: () => Int }) targetId: number) {
    await this.friendsService.sendRequest(context.req.user.userId, targetId);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async acceptFriendRequest(@Context() context, @Args('requestId', { type: () => Int }) requestId: number) {
    await this.friendsService.acceptRequest(context.req.user.userId, requestId);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async rejectFriendRequest(@Context() context, @Args('requestId', { type: () => Int }) requestId: number) {
    await this.friendsService.rejectRequest(context.req.user.userId, requestId);
    return true;
  }
  
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async removeFriend(@Context() context, @Args('friendId', { type: () => Int }) friendId: number) {
      await this.friendsService.removeFriend(context.req.user.userId, friendId);
      return true;
  }
}