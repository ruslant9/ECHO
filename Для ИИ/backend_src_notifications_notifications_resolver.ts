import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.model';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Resolver(() => Notification)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query(() => [Notification])
  @UseGuards(JwtAuthGuard)
  myNotifications(@Context() context) {
    return this.notificationsService.findAll(context.req.user.userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  markNotificationsRead(
    @Context() context,
    @Args('ids', { type: () => [Int] }) ids: number[],
  ) {
    return this.notificationsService.markAsRead(ids, context.req.user.userId);
  }
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deleteFriendRequestNotification(
    @Context() context,
    @Args('initiatorId', { type: () => Int }) initiatorId: number,
  ) {
    return this.notificationsService.deleteFriendRequestNotification(context.req.user.userId, initiatorId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deleteNotification(
    @Context() context,
    @Args('id', { type: () => Int }) id: number,
  ) {
    return this.notificationsService.remove(id, context.req.user.userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  clearAllNotifications(@Context() context) {
    return this.notificationsService.clearAll(context.req.user.userId);
  }
}