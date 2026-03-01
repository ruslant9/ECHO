import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { Conversation } from './models/conversation.model';
import { Message } from './models/message.model';
import { ConversationStats } from './models/conversation-stats.model';
import { CreateChannelInput } from './dto/create-channel.input';
import { ConversationParticipantUser } from './models/conversation-participant.model';
import { InviteLink } from './models/invite-link.model'; // убедитесь, что импортировали

@Resolver(() => Conversation)
@UseGuards(JwtAuthGuard)
export class MessagesResolver {
  constructor(private readonly messagesService: MessagesService) {}

  @Query(() => [Conversation], { description: 'Получить список всех диалогов пользователя' })
  async conversations(@Context() context) {
    return this.messagesService.getConversations(context.req.user.userId);
  }

  @Mutation(() => Int, { description: 'Создать беседу (групповой чат)' })
  async createGroupConversation(
    @Args('participantIds', { type: () => [Int] }) participantIds: number[],
    @Args('title') title: string,
    @Args('avatar', { type: () => String, nullable: true }) avatar: string,
    @Context() context,
  ) {
    return this.messagesService.createGroupConversation(
      context.req.user.userId,
      participantIds,
      title,
      avatar,
    );
  }

  @Query(() => [Message], { description: 'Получить сообщения для конкретного диалога' })
  async messages(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Args('cursor', { type: () => Int, nullable: true }) cursor: number,
    @Context() context,
  ) {
    if (!conversationId || typeof conversationId !== 'number') {
      return []; 
    }
    return this.messagesService.getMessages(context.req.user.userId, conversationId, cursor);
  }

  @Query(() => ConversationStats, { description: 'Статистика по диалогу' })
  async conversationStats(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context,
  ) {
    return this.messagesService.getConversationStats(context.req.user.userId, conversationId);
  }
  
  @Query(() => Int, { description: 'Получить количество диалогов с непрочитанными сообщениями' })
  async unreadConversationsCount(@Context() context) {
    return this.messagesService.getUnreadConversationsCount(context.req.user.userId);
  }
  
   @Query(() => [Conversation], { name: 'archivedConversations', description: 'Получить архивированные диалоги' })
  async archivedConversations(@Context() context) {
    return this.messagesService.getConversations(context.req.user.userId, true);
  }

  @Mutation(() => Boolean, { description: 'Архивировать/разархивировать диалог' })
  async toggleArchiveConversation(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context,
  ) {
    return this.messagesService.toggleArchiveConversation(context.req.user.userId, conversationId);
  }

  @Mutation(() => Message, { description: 'Отправить сообщение' })
  async sendMessage(
    @Args('content') content: string,
    @Args('conversationId', { type: () => Int, nullable: true }) conversationId: number,
    @Args('targetUserId', { type: () => Int, nullable: true }) targetUserId: number,
    @Args('replyToId', { type: () => Int, nullable: true }) replyToId: number,
    @Args('images', { type: () => [String], nullable: true }) images: string[],
    @Context() context,
  ) {
    return this.messagesService.sendMessage(
      context.req.user.userId,
      content,
      conversationId,
      targetUserId,
      replyToId,
      images,
    );
  }
  
  @Mutation(() => Message)
  @UseGuards(JwtAuthGuard)
  async toggleMessageReaction(
    @Args('messageId', { type: () => Int }) messageId: number,
    @Args('emoji') emoji: string,
    @Context() context,
  ) {
    return this.messagesService.toggleReaction(context.req.user.userId, messageId, emoji);
  }

  @Mutation(() => Message, { description: 'Закрепить/открепить сообщение' })
  async togglePinMessage(
    @Args('messageId', { type: () => Int }) messageId: number,
    @Context() context,
  ) {
    return this.messagesService.togglePinMessage(context.req.user.userId, messageId);
  }

  @Mutation(() => Conversation)
  async createChannel(
    @Args('input') input: CreateChannelInput,
    @Context() context,
  ) {
    return this.messagesService.createChannel(context.req.user.userId, input);
  }

  @Query(() => [Conversation], { description: 'Поиск каналов и чатов' })
  async searchConversations(
    @Args('query') query: string,
    @Context() context,
  ) {
    return this.messagesService.searchGlobal(context.req.user.userId, query);
  }

  @Mutation(() => Boolean)
  async joinChannel(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context,
  ) {
    return this.messagesService.joinChannel(context.req.user.userId, conversationId);
  }

  @Mutation(() => Boolean)
  async checkChannelSlug(@Args('slug') slug: string) {
    return this.messagesService.isSlugAvailable(slug);
  }
  
  @Mutation(() => Boolean, { description: 'Пометить сообщения в диалоге как прочитанные' })
  async markMessagesRead(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context,
  ) {
    return this.messagesService.markMessagesRead(context.req.user.userId, conversationId);
  }
  
  @Mutation(() => Boolean, { description: 'Закрепить/открепить диалог' })
  async togglePinConversation(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context,
  ) {
    return this.messagesService.togglePinConversation(context.req.user.userId, conversationId);
  }

  @Mutation(() => Message, { description: 'Редактировать сообщение' })
  async editMessage(
    @Args('messageId', { type: () => Int }) messageId: number,
    @Args('content') content: string,
    @Context() context,
  ) {
    return this.messagesService.editMessage(context.req.user.userId, messageId, content);
  }

  @Mutation(() => Boolean, { description: 'Включить/выключить уведомления' })
  async toggleMuteConversation(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context,
  ) {
    return this.messagesService.toggleMuteConversation(context.req.user.userId, conversationId);
  }

  @Mutation(() => Boolean, { description: 'Пометить диалог как непрочитанный' })
  async markConversationAsUnread(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context,
  ) {
    return this.messagesService.markAsUnread(context.req.user.userId, conversationId);
  }

  @Mutation(() => Boolean, { description: 'Удалить диалог целиком или скрыть для себя' })
  async deleteConversation(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Args('type', { type: () => String, description: "'ME' или 'ALL'" }) type: 'ME' | 'ALL',
    @Context() context,
  ) {
    return this.messagesService.deleteConversation(context.req.user.userId, conversationId, type);
  }

  @Mutation(() => [Message], { description: 'Переслать сообщение в один или несколько чатов' })
  async forwardMessage(
    @Args('messageId', { type: () => Int }) messageId: number,
    @Args('targetConversationIds', { type: () => [Int] }) targetConversationIds: number[],
    @Context() context,
  ) {
    return this.messagesService.forwardMessage(context.req.user.userId, messageId, targetConversationIds);
  }
  
  @Mutation(() => Boolean, { description: 'Удалить сообщение' })
  async deleteMessage(
    @Args('messageId', { type: () => Int }) messageId: number,
    @Args('type', { type: () => String, description: "'ME' или 'ALL'" }) type: 'ME' | 'ALL',
    @Context() context,
  ) {
    return this.messagesService.deleteMessage(context.req.user.userId, messageId, type);
  }

  @Mutation(() => Boolean, { description: 'Обновить беседу или канал' })
  async updateGroupConversation(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Args('title', { type: () => String, nullable: true }) title: string | null,
    @Args('avatar', { type: () => String, nullable: true }) avatar: string | null,
    @Args('description', { type: () => String, nullable: true }) description: string | null,
    @Args('slug', { type: () => String, nullable: true }) slug: string | null,
    @Context() context,
  ) {
    return this.messagesService.updateGroupConversation(
      context.req.user.userId,
      conversationId,
      title,
      avatar,
      description,
      slug
    );
  }

  @Query(() => [ConversationParticipantUser], { description: 'Получить участников беседы' })
  async conversationParticipants(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context,
  ) {
    return this.messagesService.getConversationParticipants(
      context.req.user.userId,
      conversationId,
    );
  }

  @Mutation(() => Boolean, { description: 'Исключить участника из беседы' })
  async kickFromConversation(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Context() context,
  ) {
    return this.messagesService.kickFromConversation(
      context.req.user.userId,
      conversationId,
      userId,
    );
  }

  @Mutation(() => Boolean, { description: 'Пригласить участника в беседу (только администратор)' })
  async addParticipantToConversation(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Context() context,
  ) {
    return this.messagesService.addParticipantToConversation(
      context.req.user.userId,
      conversationId,
      userId,
    );
  }

  @Mutation(() => Boolean, { description: 'Выйти из беседы. Для администратора обязателен newAdminUserId.' })
  async leaveConversation(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Args('newAdminUserId', { type: () => Int, nullable: true }) newAdminUserId: number | null,
    @Context() context,
  ) {
    return this.messagesService.leaveConversation(
      context.req.user.userId,
      conversationId,
      newAdminUserId ?? undefined,
    );
  }

  @Query(() => [InviteLink], { description: 'Получить активные ссылки беседы' })
  @UseGuards(JwtAuthGuard)
  async getConversationInvites(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Context() context: any,
  ) {
    return this.messagesService.getConversationInvites(context.req.user.userId, conversationId);
  }

  @Mutation(() => Boolean, { description: 'Удалить пригласительную ссылку' })
  @UseGuards(JwtAuthGuard)
  async revokeInviteLink(
    @Args('inviteId', { type: () => Int }) inviteId: number,
    @Context() context: any,
  ) {
    return this.messagesService.revokeInviteLink(context.req.user.userId, inviteId);
  }


  // --- ИНВАЙТ-ССЫЛКИ ---

  @Mutation(() => String, { description: 'Создать пригласительную ссылку (возвращает код)' })
  async createInviteLink(
    @Args('conversationId', { type: () => Int }) conversationId: number,
    @Args('usageLimit', { type: () => Int, nullable: true }) usageLimit: number | null,
    @Args('expiresInMinutes', { type: () => Int, nullable: true }) expiresInMinutes: number | null,
    @Context() context
  ) {
    return this.messagesService.createInviteLink(context.req.user.userId, conversationId, usageLimit, expiresInMinutes);
  }

  @Mutation(() => Boolean, { description: 'Увеличить счетчик просмотров сообщений в канале' })
  @UseGuards(JwtAuthGuard)
  async incrementMessageViews(@Args('messageIds', { type: () => [Int] }) messageIds: number[]) {
    return this.messagesService.incrementMessageViews(messageIds);
  }

  @Query(() => Conversation, { nullable: true, description: 'Получить информацию о беседе по коду приглашения' })
  async getConversationByInvite(@Args('code') code: string) {
    return this.messagesService.getConversationByInvite(code);
  }

  @Mutation(() => Boolean, { description: 'Обновить порядок закрепленных диалогов' })
  async updatePinOrder(
    @Args('conversationIds', { type: () => [Int] }) conversationIds: number[],
    @Context() context,
  ) {
    return this.messagesService.updatePinOrder(context.req.user.userId, conversationIds);
  }

  @Mutation(() => Boolean, { description: 'Вступить в беседу/канал по коду приглашения' })
  @UseGuards(JwtAuthGuard)
  async joinViaInvite(@Args('code') code: string, @Context() context) {
    return this.messagesService.joinViaInvite(context.req.user.userId, code);
  }
}