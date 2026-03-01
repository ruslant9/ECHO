import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { MessageType, ConversationType } from '@prisma/client';
import { CreateChannelInput } from './dto/create-channel.input';
import { v4 as uuidv4 } from 'uuid';

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  isOnline: true,
  lastOnlineAt: true,
  isVerified: true,
  createdAt: true,
  bio: true,
  location: true,
  gender: true,
  website: true,
  avatar: true,
  banner: true,
  isAdmin: true,
};

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private notificationsService: NotificationsService,
  ) {}

  async deleteConversation(userId: number, conversationId: number, type: 'ME' | 'ALL') {
    const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true }
    });

    if (!conversation) throw new NotFoundException('Диалог не найден');

    const isFavorites = conversation.type === ConversationType.DIRECT && 
                        conversation.participants.length === 1 && 
                        conversation.participants[0].userId === userId;

    const participant = await this.prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new NotFoundException('Диалог не найден');

   if (type === 'ME') {
        if (conversation.isGroup && (participant as any).role === 'ADMIN') {
            throw new ForbiddenException(
                'Администратор не может скрыть беседу. Вы можете передать права и выйти, либо удалить беседу для всех.'
            );
        }

        await this.prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId } },
            data: { 
                isHidden: !isFavorites, 
                clearedHistoryAt: new Date() 
            }
        });
        return true;
    }
    
    if (type === 'ALL') {
      if (isFavorites) {
          throw new ForbiddenException('Нельзя удалить "Избранное".');
      }

      if ((conversation as any).isGroup) {
          const myPart = conversation.participants.find((p: any) => p.userId === userId);
          if (!myPart || (myPart as any).role !== 'ADMIN') {
            throw new ForbiddenException('Только администратор может удалить беседу для всех');
          }
      }

      const participants = await this.prisma.conversationParticipant.findMany({ where: { conversationId }, select: { userId: true } });
      
      await this.prisma.conversation.delete({ where: { id: conversationId } });
      
      for (const p of participants) {
          this.eventsGateway.server.to(`user_${p.userId}`).emit('conversation_deleted', { id: conversationId });
      }
      return true;
    }
    return false;
  }
  
  async getOrCreateFavorites(userId: number) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        type: ConversationType.DIRECT,
        participants: {
          every: { userId: userId }
        }
      },
      include: { participants: true }
    });

    if (existing) return existing;

    const conv = await this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        isGroup: false,
        participants: {
          create: [{ userId, role: 'ADMIN' }]
        }
      }
    });
    return conv;
  }
  
  async createGroupConversation(
    creatorId: number,
    participantIds: number[],
    title: string,
    avatar?: string,
  ) {
      const uniqueIds = Array.from(
      new Set(participantIds.filter((id) => id && id !== creatorId)),
    );

    if (uniqueIds.length < 2) {
      throw new ForbiddenException(
        'В беседе должно быть минимум 3 участника (вы + ещё 2).',
      );
    }

    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { name: true, username: true },
    });

    const creatorName = creator?.name || creator?.username || 'Пользователь';

    const conv = await (this.prisma.conversation as any).create({
      data: {
        isGroup: true,
        type: ConversationType.GROUP,
        title,
        avatar,
        participants: {
          create: [
            { userId: creatorId, role: 'ADMIN' },
            ...uniqueIds.map((id) => ({ userId: id, role: 'MEMBER' })),
          ],
        },
        messages: {
          create: {
            content: `${creatorName} создал беседу`,
            senderId: creatorId,
            type: MessageType.SYSTEM,
            isPinned: false,
          },
        },
      } as any,
    });

    const allParticipantIds = [creatorId, ...uniqueIds];
    allParticipantIds.forEach((participantId) => {
      this.eventsGateway.server.to(`user_${participantId}`).emit('message_received', {
        conversationId: conv.id,
      });
    });

    return conv.id;
  }

   async getConversations(userId: number, isArchived = false) {
    if (!isArchived) {
        await this.getOrCreateFavorites(userId);
    }

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { 
        userId,
        isArchived: isArchived,
        isHidden: false,
      },
      include: {
        conversation: {
          include: {
            _count: {
              select: { participants: true },
            },
            participants: { 
              include: { user: { select: userSelect } } 
            },
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { pinOrder: 'asc' },      
        { conversation: { updatedAt: 'desc' } },
      ],
    });

    const conversations = await Promise.all(
      participants.map(async (p) => {
        let otherParticipantObj = p.conversation.participants.find(part => part.userId !== userId);
        
        if (!p.conversation.isGroup && !otherParticipantObj) {
             otherParticipantObj = p.conversation.participants.find(part => part.userId === userId);
        }
        
        if (!(p.conversation as any).isGroup && !otherParticipantObj) {
          return null;
        }
        
        const isKicked = !!(p as any).isKicked;
        const kickedAt = (p as any).kickedAt as Date | null;
        const createdAtFilter = isKicked && kickedAt
          ? { gt: p.clearedHistoryAt || new Date(0), lte: kickedAt }
          : { gt: p.clearedHistoryAt || new Date(0) };

        const realLastMessage = await this.prisma.message.findFirst({
          where: {
            conversationId: p.conversationId,
            createdAt: createdAtFilter,
            deletedFor: {
              none: {
                userId: userId
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          select: { 
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            images: true,
            readBy: { where: { userId } },
            reactions: {
              select: {
                id: true,
                userId: true,
                emoji: true
              }
            }
          }
        });

        let lastMessage = null;
        let isRead = true; 

        if (realLastMessage) {
            isRead = realLastMessage.senderId === userId || realLastMessage.readBy.length > 0;
            lastMessage = { ...realLastMessage, isRead };
        }

        const hasLeft = isKicked;
        const unreadCount = hasLeft
          ? 0
          : await this.prisma.message.count({ 
              where: { 
                conversationId: p.conversationId, 
                senderId: { not: userId }, 
                readBy: { none: { userId } },
                createdAt: { gt: p.clearedHistoryAt || new Date(0) },
                deletedFor: { none: { userId } },
              } 
            });

        const participantsCount = await this.prisma.conversationParticipant.count({
          where: { conversationId: p.conversationId, isKicked: false },
        });

        const listUpdatedAt = hasLeft && (realLastMessage?.createdAt || kickedAt)
          ? (realLastMessage?.createdAt ?? kickedAt)
          : p.conversation.updatedAt;

        return {
          id: p.conversationId,
          isGroup: (p.conversation as any).isGroup ?? false,
          type: (p.conversation as any).type,
          title: (p.conversation as any).title ?? null,
          avatar: (p.conversation as any).avatar ?? null,
          participant: (p.conversation as any).isGroup ? null : otherParticipantObj?.user,
          myRole: (p as any).role ?? 'MEMBER',
          hasLeft,
          participantsCount,
          lastMessage,
          unreadCount,
          isManuallyUnread: p.isManuallyUnread,
          isPinned: p.isPinned,
          pinOrder: p.pinOrder, 
          mutedUntil: p.mutedUntil,
          updatedAt: listUpdatedAt,
          isArchived: p.isArchived,
        };
      }),
    );
    return conversations.filter(Boolean);
  }

  async updatePinOrder(userId: number, conversationIds: number[]): Promise<boolean> {
    await this.prisma.$transaction(async (tx) => {
      await tx.conversationParticipant.updateMany({
        where: { userId, isPinned: true },
        data: { pinOrder: 0 },
      });

      for (let i = 0; i < conversationIds.length; i++) {
        await tx.conversationParticipant.update({
          where: {
            conversationId_userId: {
              conversationId: conversationIds[i],
              userId: userId,
            },
          },
          data: { pinOrder: i },
        });
      }
    });
    return true;
  }

  async getConversationInvites(userId: number, conversationId: number) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant || participant.role !== 'ADMIN') {
      throw new ForbiddenException('Только администратор может видеть ссылки');
    }

    return this.prisma.inviteLink.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: { creator: true }
    });
  }

  async revokeInviteLink(userId: number, inviteId: number) {
    const invite = await this.prisma.inviteLink.findUnique({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Ссылка не найдена');

    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: invite.conversationId, userId } },
    });
    if (!participant || participant.role !== 'ADMIN') {
      throw new ForbiddenException('Только администратор может удалять ссылки');
    }

    await this.prisma.inviteLink.delete({ where: { id: inviteId } });
    return true;
  }

  async forwardMessage(userId: number, originalMessageId: number, targetConversationIds: number[]) {
    const originalMessage = await this.prisma.message.findUnique({
      where: { id: originalMessageId },
      include: { conversation: { include: { participants: true } } }
    });

    if (!originalMessage) throw new NotFoundException('Сообщение не найдено');

    const myPartInOriginal = originalMessage.conversation.participants.find((p: any) => p.userId === userId);
    if (!myPartInOriginal) throw new ForbiddenException('Нет доступа к сообщению');

    const originalAuthorId = originalMessage.forwardedFromId || originalMessage.senderId;

    const forwardedMessages = [];

    for (const convId of targetConversationIds) {
      const targetParticipant = await this.prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: convId, userId } }
      });

      if (!targetParticipant || (targetParticipant as any).isKicked) continue;

      const newMessage = await this.prisma.message.create({
        data: {
          content: originalMessage.content,
          images: (originalMessage as any).images ?? undefined,
          senderId: userId,
          conversationId: convId,
          forwardedFromId: originalAuthorId,
          type: MessageType.REGULAR,
        },
        include: { 
          sender: { select: userSelect }, 
          forwardedFrom: { select: userSelect },
          replyTo: { include: { sender: { select: userSelect } } } 
        }
      });

      await this.prisma.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });
      
      await this.prisma.conversationParticipant.updateMany({
        where: { conversationId: convId },
        data: { isHidden: false, isArchived: false, isManuallyUnread: false }
      });

      const participants = await this.prisma.conversationParticipant.findMany({
        where: { conversationId: convId, isKicked: false },
      });
      participants.forEach(p => {
         this.eventsGateway.server.to(`user_${p.userId}`).emit('message_received', {
             ...newMessage,
             isRead: false 
         });
      });

      forwardedMessages.push(newMessage);
    }

    return forwardedMessages;
  }

  async getUnreadConversationsCount(userId: number): Promise<number> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { 
        userId,
        isArchived: false,
        isHidden: false,
        isKicked: false,
        OR: [
          { mutedUntil: null },
          { mutedUntil: { lt: new Date() } }
        ]
      },
      select: { conversationId: true, isManuallyUnread: true, clearedHistoryAt: true }
    });

    let count = 0;
    for (const p of participants) {
      if (p.isManuallyUnread) {
        count++;
        continue; 
      }
      
      const hasUnreadMessages = await this.prisma.message.findFirst({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          readBy: { none: { userId } },
          createdAt: { gt: p.clearedHistoryAt || new Date(0) },
          deletedFor: {
              none: {
                  userId: userId
              }
          }
        },
        select: { id: true }
      });
      if (hasUnreadMessages) count++;
    }
    return count;
  }
  
  async toggleArchiveConversation(userId: number, conversationId: number): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Доступ запрещен');

    const updated = await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { 
        isArchived: !participant.isArchived,
        isManuallyUnread: false
      },
    });
    return updated.isArchived;
  }

  async sendMessage(
    senderId: number,
    content: string,
    conversationId?: number,
    targetUserId?: number,
    replyToId?: number,
    images?: string[],
  ) {
    if (!conversationId && !targetUserId) throw new ForbiddenException('Необходимо указать диалог или получателя.');
    
    const finalConvId = conversationId ?? await this.findOrCreateConversation(senderId, targetUserId!);

    const myParticipant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: finalConvId, userId: senderId } },
    });
    
    const conversation = await this.prisma.conversation.findUnique({ where: { id: finalConvId } });
    
    if (!myParticipant) throw new ForbiddenException('Вы не являетесь участником этой беседы.');
    if ((myParticipant as any).isKicked) throw new ForbiddenException('Вы вышли из этой беседы.');
    
    if (conversation?.type === ConversationType.CHANNEL) {
        if ((myParticipant as any).role !== 'ADMIN' && !(myParticipant as any).permissions?.canPost) {
            throw new ForbiddenException('У вас нет прав писать в этот канал');
        }
    }
    
    const participantsCount = await this.prisma.conversationParticipant.count({
        where: { conversationId: finalConvId, isKicked: false },
    });

    if (participantsCount < 2 && !conversation?.type && !conversation?.isGroup) {
        const isSelfChat = participantsCount === 1 && (await this.prisma.conversationParticipant.findFirst({ where: { conversationId: finalConvId, userId: senderId } }));
        
        if (!isSelfChat) {
             console.warn(`Attempted to send message to orphaned conversation ID: ${finalConvId}`);
        }
    }

    if (!conversation?.isGroup) {
        if (senderId !== targetUserId) {
            const otherParticipant = await this.prisma.conversationParticipant.findFirst({
                where: {
                    conversationId: finalConvId,
                    userId: { not: senderId },
                    isKicked: false,
                },
            });
            
            if (otherParticipant) {
                const block = await this.prisma.block.findFirst({
                    where: {
                        OR: [
                            { blockerId: senderId, blockedId: otherParticipant.userId }, 
                            { blockerId: otherParticipant.userId, blockedId: senderId }  
                        ]
                    }
                });

                if (block) {
                    if (block.blockerId === senderId) {
                        throw new ForbiddenException('Вы заблокировали этого пользователя. Разблокируйте, чтобы написать.');
                    } else {
                        throw new ForbiddenException('Вы не можете отправлять сообщения этому пользователю.');
                    }
                }
            }
        }
    }
    
    if (!conversation?.isGroup) {
         const otherParticipant = await this.prisma.conversationParticipant.findFirst({
            where: { conversationId: finalConvId, userId: { not: senderId } },
         });
         
         if (otherParticipant) {
             const shouldUnarchive = otherParticipant.isArchived && (!otherParticipant.mutedUntil || otherParticipant.mutedUntil < new Date());
             const shouldResetHistory = otherParticipant.isHidden;
             const newClearedHistoryAt = shouldResetHistory ? new Date(Date.now() - 2000) : undefined;

             await this.prisma.conversationParticipant.update({
                  where: { conversationId_userId: { conversationId: finalConvId, userId: otherParticipant.userId } },
                  data: { 
                      isManuallyUnread: false, 
                      isHidden: false, 
                      ...(shouldUnarchive && { isArchived: false }),
                      ...(newClearedHistoryAt && { clearedHistoryAt: newClearedHistoryAt })
                  } 
             });
         }
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({ 
          data: { 
            content, 
            images: images && images.length > 0 ? images : undefined, 
            senderId, 
            conversationId: finalConvId, 
            replyToId,
            isAnonymous: conversation?.type === ConversationType.CHANNEL 
          } as any, 
          include: { sender: { select: userSelect }, forwardedFrom: { select: userSelect },  replyTo: { include: { sender: { select: userSelect } } } } 
      }),
      this.prisma.conversation.update({ where: { id: finalConvId }, data: { updatedAt: new Date() } }),
      
      this.prisma.conversationParticipant.update({
              where: { conversationId_userId: { conversationId: finalConvId, userId: senderId } },
              data: { 
                  isHidden: false, 
                  isArchived: false 
              } 
          })
    ]);

    const activeParticipants = await this.prisma.conversationParticipant.findMany({
        where: { conversationId: finalConvId, isKicked: false },
        select: { userId: true },
    });
    
    activeParticipants.forEach((p) => {
        this.eventsGateway.server.to(`user_${p.userId}`).emit('message_received', message);
    });

    const recipients = await this.prisma.conversationParticipant.findMany({
        where: { conversationId: finalConvId, isKicked: false, userId: { not: senderId } },
        select: { userId: true, mutedUntil: true },
    });

    const conversationTitle = conversation?.title ?? 'Беседа';
    const conversationAvatar = conversation?.avatar ?? null;
    
    let snippet = content.substring(0, 30);
    if (content.length > 30) snippet += '...';
    if (snippet.length === 0 && (message as any).images && (message as any).images.length > 0) {
        snippet = '📷 Фото';
    }

    for (const r of recipients) {
        if (r.mutedUntil && new Date(r.mutedUntil) > new Date()) continue;
        
        const settings = await this.prisma.notificationSettings.findUnique({
          where: { userId: r.userId },
        });
        if (settings?.muteAllUntil && new Date() < new Date(settings.muteAllUntil)) continue;
        if (settings?.notifyOnMessages === false) continue;

        const notifMessage = conversation?.isGroup
            ? `сообщение в "${conversationTitle}": "${snippet}"`
            : `отправил(а) вам сообщение: "${snippet}"`;

        this.notificationsService.create(
          r.userId,
          'NEW_MESSAGE',
          notifMessage,
          senderId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          finalConvId,
          conversation?.isGroup ? conversationTitle : undefined,
          conversation?.isGroup ? conversationAvatar : undefined,
        );
    }

    return { ...message, isRead: false }; 
  }

  async markMessagesRead(userId: number, conversationId: number) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Доступ запрещен');
    if ((participant as any).isKicked) throw new ForbiddenException('Вы вышли из этой беседы');

    const unreadMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readBy: { none: { userId } },
      },
      select: { id: true },
    });

    if (unreadMessages.length > 0) {
      await this.prisma.messageReadStatus.createMany({
        data: unreadMessages.map(m => ({ messageId: m.id, userId })),
        skipDuplicates: true,
      });
    }

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { isManuallyUnread: false }
    });
    
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (conv && conv.type === ConversationType.DIRECT) {
        const otherParticipant = await this.prisma.conversationParticipant.findFirst({ where: { conversationId, userId: { not: userId } } });
        if (otherParticipant) {
            this.eventsGateway.server.to(`user_${otherParticipant.userId}`).emit('messages_read', { conversationId, readerId: userId });
        }
    }
    
    return true;
  }

  async toggleReaction(userId: number, messageId: number, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    });
    if (!message) throw new NotFoundException('Сообщение не найдено');
    const myPart = message.conversation.participants.find((p: any) => p.userId === userId);
    if (!myPart || (myPart as any).isKicked) throw new ForbiddenException('Вы вышли из этой беседы');

    if (!(message.conversation as any).isGroup) {
        const otherParticipant = message.conversation.participants.find(p => p.userId !== userId);
        if (otherParticipant) {
            const block = await this.prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: userId, blockedId: otherParticipant.userId },
                        { blockerId: otherParticipant.userId, blockedId: userId }
                    ]
                }
            });
            if (block) {
                throw new ForbiddenException('Вы не можете реагировать на сообщения в этом диалоге.');
            }
        }
    }
  
    const existingReaction = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });
  
    if (existingReaction && existingReaction.emoji === emoji) {
      await this.prisma.messageReaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      await this.prisma.messageReaction.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { emoji },
        create: { messageId, userId, emoji },
      });
  
      if (message.senderId !== userId) {
        this.eventsGateway.server.to(`user_${message.senderId}`).emit('unread_reaction', {
            conversationId: message.conversationId,
        });
      }
    }
  
    const updatedMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: userSelect },
        reactions: { include: { user: { select: userSelect } } },
        replyTo: { include: { sender: { select: userSelect } } },
        readBy: true,
      },
    });
  
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: message.conversationId, isKicked: false },
    });
    participants.forEach((p) => {
      this.eventsGateway.server.to(`user_${p.userId}`).emit('message_updated', {
        ...updatedMessage,
        isRead: updatedMessage.readBy.some((r) => r.userId === p.userId),
      });
    });

    return updatedMessage;
  }

  async markAsUnread(userId: number, conversationId: number): Promise<boolean> {
    try {
      await this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { isManuallyUnread: true }
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  
  async createChannel(userId: number, input: CreateChannelInput) {
    if (input.slug) {
      const exists = await this.prisma.conversation.findUnique({
        where: { slug: input.slug },
      });
      if (exists) throw new BadRequestException('Это имя пользователя уже занято');
    }

    const channel = await this.prisma.conversation.create({
      data: {
        type: ConversationType.CHANNEL,
        isGroup: true,
        title: input.title,
        description: input.description,
        avatar: input.avatar,
        slug: input.slug || null, 
        ownerId: userId,
        participants: {
          create: {
            userId,
            role: 'ADMIN',
            permissions: { canPost: true, canEdit: true, canDelete: true, canInvite: true },
          },
        },
        messages: {
          create: {
            content: `Канал «${input.title}» создан`,
            senderId: userId,
            type: MessageType.SYSTEM,
          },
        },
      },
    });

    return channel;
  }

  async searchGlobal(userId: number, query: string) {
    if (!query || query.length < 2) return [];

    const channels = await this.prisma.conversation.findMany({
      where: {
        type: ConversationType.CHANNEL,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
        slug: { not: null }, 
      },
      include: {
        _count: { select: { participants: true } },
      },
      take: 10,
    });

    return channels.map(c => ({
      ...c,
      isChannel: true,
      participant: null,
      participantsCount: c._count.participants,
    }));
  }

  async joinChannel(userId: number, conversationId: number) {
    const channel = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!channel || channel.type !== ConversationType.CHANNEL) {
      throw new NotFoundException('Канал не найден');
    }

    if (!channel.slug) {
        throw new ForbiddenException('Это частный канал');
    }

    const existing = await this.prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } }
    });
    if (existing && existing.banned) throw new ForbiddenException('Вы заблокированы в этом канале');
    if (existing && !existing.isKicked) return true; 

    if (existing) {
        await this.prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId } },
            data: { isKicked: false, kickedAt: null, role: 'MEMBER', isHidden: false }
        });
    } else {
        await this.prisma.conversationParticipant.create({
            data: {
                conversationId,
                userId,
                role: 'MEMBER',
                permissions: { canPost: false },
            },
        });
    }

    return true;
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    const count = await this.prisma.conversation.count({ where: { slug } });
    return count === 0;
  }

   async deleteMessage(userId: number, messageId: number, type: 'ME' | 'ALL') {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { participants: true } } },
    });
    if (!message) throw new NotFoundException('Сообщение не найдено');
    
    if (type === 'ALL') {
        const myPart = message.conversation.participants.find((p: any) => p.userId === userId);
        const isAdmin = (myPart as any)?.role === 'ADMIN';
        
        if (message.senderId !== userId && !isAdmin) {
            throw new ForbiddenException('Нет прав на удаление этого сообщения');
        }
        
        await this.prisma.message.delete({ where: { id: messageId } });
    } else {
        await this.prisma.deletedMessageForUser.create({
            data: { userId, messageId }
        });
    }
    
    const { conversationId } = message;
    
    const newLastMessage = await this.prisma.message.findFirst({
      where: {
        conversationId,
        deletedFor: { none: { userId } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        updatedAt: newLastMessage?.createdAt || new Date()
      }
    });
    
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, isKicked: false },
    });
    
    participants.forEach(p => {
        this.eventsGateway.server.to(`user_${p.userId}`).emit('conversation_updated', {
            id: conversationId,
            lastMessage: newLastMessage 
        });
        
        if (type === 'ALL') {
             this.eventsGateway.server.to(`user_${p.userId}`).emit('message_deleted', { id: messageId });
        }
    });
    
    return true;
  }

  async getMessages(userId: number, conversationId: number, cursor?: number) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) throw new ForbiddenException('Доступ запрещен');
    const cutoffDate = participant.clearedHistoryAt || new Date(0);
    const isKicked = (participant as any).isKicked;
    const kickedAt = (participant as any).kickedAt as Date | null;
    
    const createdAtFilter = isKicked && kickedAt
      ? { gt: cutoffDate, lte: kickedAt }
      : { gt: cutoffDate };

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        createdAt: createdAtFilter,
        deletedFor: {
            none: {
                userId: userId
            }
        }
      },
      take: 30,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: userSelect },
        replyTo: { include: { sender: { select: userSelect } } },
        readBy: {
          where: { userId: { not: userId } },
          include: { user: { select: userSelect } },
        },
        reactions: {
            include: {
                user: { select: userSelect }
            }
        },
        forwardedFrom: { select: userSelect },
      },
    });
    
    const mapMessage = (m: any) => {
      let isPinned = m.isPinned;
      let reactions = m.reactions;
      if (isKicked && kickedAt) {
        const leaveTime = new Date(kickedAt).getTime();
        if (new Date(m.updatedAt).getTime() > leaveTime) isPinned = false;
        reactions = (m.reactions || []).filter((r: any) => new Date(r.createdAt).getTime() <= leaveTime);
      }
      const readBy = (m.readBy || []).map((r: any) => ({ user: r.user, readAt: r.readAt }));
      return { ...m, isPinned, reactions, readBy, isRead: m.readBy.length > 0 };
    };
    return messages.map(mapMessage).reverse();
  }

  private async findOrCreateConversation(userId1: number, userId2: number): Promise<number> {
    if (userId1 === userId2) {
        const selfChat = await this.getOrCreateFavorites(userId1);
        return selfChat.id;
    }

    const existing = await this.prisma.conversation.findFirst({
      where: { 
          isGroup: false,
          type: ConversationType.DIRECT,
          participants: { every: { userId: { in: [userId1, userId2] } } } 
      },
    });
    if (existing) return existing.id;
    const newConversation = await this.prisma.conversation.create({
      data: { participants: { create: [{ userId: userId1 }, { userId: userId2 }] } },
    });
    return newConversation.id;
  }

  async toggleMuteConversation(userId: number, conversationId: number): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Доступ запрещен');
    const isMuted = participant.mutedUntil && participant.mutedUntil > new Date();
    const newMutedUntil = isMuted ? null : new Date(new Date().setFullYear(new Date().getFullYear() + 100));
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { mutedUntil: newMutedUntil },
    });
    return !isMuted;
  }

  async editMessage(userId: number, messageId: number, content: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { participants: true } } },
    });
    if (!message || message.senderId !== userId) throw new ForbiddenException('Нет прав');
    
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() } as any,
    });
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: message.conversationId, isKicked: false },
    });
    participants.forEach((p) => this.eventsGateway.server.to(`user_${p.userId}`).emit('message_updated', updated));
    return updated;
  }

  async togglePinConversation(userId: number, conversationId: number) {
    const p = await this.prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!p) throw new ForbiddenException();
    if ((p as any).isKicked) throw new ForbiddenException('Вы вышли из этой беседы');
    const u = await this.prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { isPinned: !p.isPinned } });
    this.eventsGateway.server.to(`user_${userId}`).emit('conversation_updated', { id: conversationId, isPinned: u.isPinned });
    return u.isPinned;
  }

  async togglePinMessage(userId: number, messageId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          select: {
            id: true,
            type: true,
            participants: { select: { userId: true, role: true, permissions: true, isKicked: true } }
          }
        }
      }
    });

    if (!message) throw new NotFoundException('Сообщение не найдено');
    
    const myPart = message.conversation.participants.find((p: any) => p.userId === userId);
    if (!myPart || (myPart as any).isKicked) throw new ForbiddenException('Вы вышли из этой беседы');

    if (message.conversation.type === ConversationType.CHANNEL || message.conversation.type === ConversationType.GROUP) {
        if ((myPart as any).role !== 'ADMIN') {
             throw new ForbiddenException('Только администратор может закреплять сообщения');
        }
    }

    const isPinnedNewValue = !message.isPinned;

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: isPinnedNewValue },
      include: { 
        sender: { select: userSelect },
        replyTo: { include: { sender: { select: userSelect } } },
        reactions: { include: { user: { select: userSelect } } },
      }
    });

    message.conversation.participants
      .filter((p) => !(p as any).isKicked)
      .forEach((p) => {
        this.eventsGateway.server.to(`user_${p.userId}`).emit('message_updated', {
          ...updatedMessage,
          isPinned: isPinnedNewValue,
        });
      });

    if (message.conversation.type !== ConversationType.CHANNEL) {

    const sender = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } });
    const displayName = sender?.name || sender?.username;
    
    let sysContent: string;
    const hasOriginalMessageContent = message.content && message.content.trim().length > 0;
    const messageImagesArray = message.images as string[] | null | undefined;
    const hasOriginalMessageImages = messageImagesArray && messageImagesArray.length > 0;

    const actionText = isPinnedNewValue ? 'закрепил(а)' : 'открепил(а)';

    if (hasOriginalMessageContent) {
        let snippet = message.content.substring(0, 20);
        if (message.content.length > 20) snippet += '...';
        sysContent = `${displayName} ${actionText} сообщение: "${snippet}"`;
    } else if (hasOriginalMessageImages) {
        sysContent = `${displayName} ${actionText} фотографию`;
    } else {
        sysContent = `${displayName} ${actionText} сообщение`; 
    }

    const systemMessage = await this.prisma.message.create({
      data: {
        conversationId: message.conversationId,
        senderId: userId, 
        content: sysContent,
        type: MessageType.SYSTEM,
      },
      include: { sender: { select: userSelect } }
    });

    const socketPayload = { ...systemMessage, isRead: false };

    message.conversation.participants.forEach(p => {
        if (!(p as any).isKicked) {
             this.eventsGateway.server.to(`user_${p.userId}`).emit('message_received', socketPayload);
        }
    });}

    return updatedMessage;
  }

  async getConversationStats(userId: number, conversationId: number) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Доступ запрещен');
    if ((participant as any).isKicked) throw new ForbiddenException('Вы вышли из этой беседы');

    const cutoffDate = participant.clearedHistoryAt || new Date(0);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        type: MessageType.REGULAR, 
        createdAt: { gt: cutoffDate },
        deletedFor: {
          none: { userId },
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        senderId: true,
        isPinned: true,
        reactions: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (messages.length === 0) {
      return {
        totalMessages: 0,
        sentCount: 0,
        receivedCount: 0,
        totalReactions: 0,
        sentReactions: 0,
        receivedReactions: 0,
        pinnedMessagesCount: 0,
        firstMessageAt: null,
        lastMessageAt: null,
        daily: [],
      };
    }

    const totalMessages = messages.length;
    const sentCount = messages.filter((m) => m.senderId === userId).length;
    const receivedCount = totalMessages - sentCount;

    let totalReactions = 0;
    let sentReactions = 0;
    let receivedReactions = 0;

    let pinnedMessagesCount = 0;

    const firstMessageAt = messages[0].createdAt;
    const lastMessageAt = messages[messages.length - 1].createdAt;

    const dailyMap = new Map<
      string,
      { date: string; total: number; sent: number; received: number }
    >();

    for (const m of messages) {
      const key = m.createdAt.toISOString().slice(0, 10); 
      if (!dailyMap.has(key)) {
        dailyMap.set(key, { date: key, total: 0, sent: 0, received: 0 });
      }
      const entry = dailyMap.get(key)!;
      entry.total += 1;
      if (m.senderId === userId) {
        entry.sent += 1;
      } else {
        entry.received += 1;
      }

      const reactions = m.reactions ?? [];
      if (reactions.length > 0) {
        totalReactions += reactions.length;
        for (const r of reactions) {
          if (r.userId === userId) {
            sentReactions += 1;
          } else {
            receivedReactions += 1;
          }
        }
      }

      if (m.isPinned) {
        pinnedMessagesCount += 1;
      }
    }

    const daily = Array.from(dailyMap.values());

    return {
      totalMessages,
      sentCount,
      receivedCount,
      totalReactions,
      sentReactions,
      receivedReactions,
      pinnedMessagesCount,
      firstMessageAt,
      lastMessageAt,
      daily,
    };
  }

  async updateGroupConversation(
    userId: number,
    conversationId: number,
    title?: string | null,
    avatar?: string | null,
    description?: string | null,
    slug?: string | null,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      include: {
        conversation: true,
      },
    });

    if (!participant) throw new ForbiddenException('Вы не являетесь участником этой беседы');
    if ((participant as any).isKicked) throw new ForbiddenException('Вы вышли из этой беседы');
    if ((participant as any).role !== 'ADMIN') throw new ForbiddenException('Только администратор может редактировать беседу');

    if (participant.conversation.type === 'DIRECT') throw new BadRequestException('Это не групповая беседа');

    const updateData: any = {};
    if (title !== undefined) updateData.title = title || null;
    if (avatar !== undefined) updateData.avatar = avatar || null;
    if (description !== undefined) updateData.description = description || null;
    
    if (slug !== undefined) {
        if (slug === null || slug.trim() === '') {
            updateData.slug = null; 
        } else {
            const existing = await this.prisma.conversation.findUnique({ where: { slug } });
            if (existing && existing.id !== conversationId) {
                throw new ConflictException('Эта ссылка уже занята');
            }
            updateData.slug = slug;
        }
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: updateData,
      });
    }

    const allParticipants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, isKicked: false },
      select: { userId: true },
    });
    allParticipants.forEach((p) => {
      this.eventsGateway.server.to(`user_${p.userId}`).emit('conversation_updated', {
        conversationId,
      });
    });

    return true;
  }

  async getConversationParticipants(userId: number, conversationId: number) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: { conversation: true }
    });

    if (!participant) throw new ForbiddenException('Вы не являетесь участником этой беседы');
    if ((participant as any).isKicked) throw new ForbiddenException('Вы вышли из этой беседы');

    if (participant.conversation.type === 'CHANNEL' && participant.role !== 'ADMIN') {
      throw new ForbiddenException('Только администратор может просматривать участников канала');
    }

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { 
        conversationId,
        isKicked: false, 
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            isOnline: true,
            lastOnlineAt: true,
          },
        },
      },
    });

    return participants.map((p) => ({
      id: p.user.id,
      username: p.user.username,
      name: p.user.name,
      avatar: p.user.avatar,
      role: (p as any).role || 'MEMBER',
      isOnline: p.user.isOnline || false,
      lastOnlineAt: (p.user as any).lastOnlineAt ?? undefined,
    }));
  }

  async kickFromConversation(
    userId: number,
    conversationId: number,
    targetUserId: number,
  ) {
    const adminParticipant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!adminParticipant || (adminParticipant as any).role !== 'ADMIN') {
      throw new ForbiddenException('Только администратор может исключать участников');
    }

    const targetParticipant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });

    if (!targetParticipant) throw new BadRequestException('Пользователь не является участником');
    if ((targetParticipant as any).role === 'ADMIN') throw new BadRequestException('Нельзя исключить администратора');

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      data: { isKicked: true, kickedAt: new Date() } as any,
    });

    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    const adminUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true, username: true } });

    const adminName = adminUser?.name || adminUser?.username || 'Администратор';
    const targetName = targetUser?.name || targetUser?.username || 'Пользователь';

    if (conversation?.type !== ConversationType.CHANNEL) {
    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: `${adminName} исключил(а) ${targetName}`,
        type: MessageType.SYSTEM,
      } as any,
    });}

    const allParticipants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, isKicked: false },
      select: { userId: true },
    });
    
    [...allParticipants, { userId: targetUserId }].forEach((p) => {
        this.eventsGateway.server.to(`user_${p.userId}`).emit('conversation_updated', { conversationId });
    });

    return true;
  }

  async addParticipantToConversation(adminUserId: number, conversationId: number, targetUserId: number) {
    const adminParticipant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: adminUserId } },
      include: { conversation: true },
    });
    if (!adminParticipant) throw new ForbiddenException('Вы не являетесь участником');
    if ((adminParticipant as any).role !== 'ADMIN') throw new ForbiddenException('Только администратор может приглашать');

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, username: true },
    });
    if (!targetUser) throw new NotFoundException('Пользователь не найден');

    const existing = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });
    if (existing && existing.banned) throw new ForbiddenException('Пользователь забанен в этом чате');

    if (existing) {
      if (!(existing as any).isKicked) throw new BadRequestException('Пользователь уже в беседе');
      await this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: targetUserId } },
        data: { isKicked: false, kickedAt: null, role: 'MEMBER', isHidden: false} as any,
      });
    } else {
      await this.prisma.conversationParticipant.create({
        data: { conversationId, userId: targetUserId, role: 'MEMBER' },
      });
    }

    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId }, select: { name: true, username: true } });
    const adminName = adminUser?.name || adminUser?.username || 'Администратор';
    const targetName = targetUser.name || targetUser.username || 'Пользователь';

    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: adminUserId,
        content: `${adminName} добавил(а) ${targetName}`,
        type: MessageType.SYSTEM,
      },
    }); 

    const allParticipants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, isKicked: false },
      select: { userId: true },
    });
    allParticipants.forEach((p) => {
      this.eventsGateway.server.to(`user_${p.userId}`).emit('conversation_updated', { conversationId });
    });

    return true;
  }

  async leaveConversation(userId: number, conversationId: number, newAdminUserId?: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation || !conversation.isGroup) throw new BadRequestException('Беседа не найдена');

    const myParticipant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!myParticipant) throw new ForbiddenException('Вы не являетесь участником');

    const myRole = (myParticipant as any).role;

    if (myRole === 'ADMIN') {
      const activeParticipants = conversation.participants.filter(p => !p.isKicked);
      if (activeParticipants.length > 1) {
          if (!newAdminUserId) throw new BadRequestException('Администратор должен назначить преемника');
          
          const newAdmin = activeParticipants.find(p => p.userId === newAdminUserId);
          if (!newAdmin) throw new BadRequestException('Преемник не найден в чате');
          
          await this.prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId: newAdminUserId } },
            data: { role: 'ADMIN' as any },
          });
      }
    }

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { 
      isKicked: true, 
      kickedAt: new Date(),
      isHidden: true, // <--- ДОБАВЬТЕ ЭТО, чтобы чат сразу исчез из списка у выходящего
    } as any,
  });

    const leavingUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
    const leavingName = leavingUser?.name || leavingUser?.username || 'Участник';
    
    if (conversation.type !== ConversationType.CHANNEL) {
    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: `${leavingName} вышел(а) из беседы`,
        type: MessageType.SYSTEM,
      },
    });}

    const allParticipants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, isKicked: false },
      select: { userId: true },
    });
    allParticipants.forEach((p) => {
      this.eventsGateway.server.to(`user_${p.userId}`).emit('conversation_updated', { conversationId });
    });

    return true;
  }

  async createInviteLink(userId: number, conversationId: number, usageLimit: number | null, expiresInMinutes: number | null) {
     const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
     });
     if (!participant || participant.role !== 'ADMIN') throw new ForbiddenException();

     const code = uuidv4().slice(0, 8); 
     let expiresAt = null;
     
     if (expiresInMinutes) {
         expiresAt = new Date();
         expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
     }

     await this.prisma.inviteLink.create({
         data: {
             code,
             conversationId,
             creatorId: userId,
             usageLimit,
             expiresAt
         }
     });

     return code;
  }

  async getConversationByInvite(code: string) {
      const invite = await this.prisma.inviteLink.findUnique({
          where: { code },
          include: { conversation: { include: { _count: { select: { participants: true } } } } }
      });

      if (!invite) throw new NotFoundException('Ссылка недействительна');
      if (invite.expiresAt && new Date() > invite.expiresAt) throw new NotFoundException('Ссылка истекла');
      if (invite.usageLimit && invite.usedCount >= invite.usageLimit) throw new NotFoundException('Лимит использования исчерпан');

      const c = invite.conversation;
      return {
          ...c,
          participantsCount: (c as any)._count.participants
      };
  }

  async joinViaInvite(userId: number, code: string) {
      const invite = await this.prisma.inviteLink.findUnique({ where: { code }, include: { conversation: true } });
      if (!invite) throw new NotFoundException('Ссылка недействительна');
      if (invite.expiresAt && new Date() > invite.expiresAt) throw new NotFoundException('Ссылка истекла');
      if (invite.usageLimit && invite.usedCount >= invite.usageLimit) throw new NotFoundException('Лимит использования исчерпан');

      const existing = await this.prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId: invite.conversationId, userId } }
      });
      
      if (existing) {
          if (!existing.isKicked) return true; 
          await this.prisma.conversationParticipant.update({
              where: { conversationId_userId: { conversationId: invite.conversationId, userId } },
              data: { isKicked: false, kickedAt: null, role: 'MEMBER', isHidden: false }
          });
      } else {
          await this.prisma.conversationParticipant.create({
              data: {
                  userId,
                  conversationId: invite.conversationId,
                  role: 'MEMBER'
              }
          });
      }

      await this.prisma.inviteLink.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } }
      });
      
      if (invite.conversation.type !== ConversationType.CHANNEL) {
      const joiner = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
      const name = joiner?.name || joiner?.username || 'Пользователь';
      await this.prisma.message.create({
          data: {
              conversationId: invite.conversationId,
              senderId: userId,
              content: `${name} вступил(а) по ссылке`,
              type: MessageType.SYSTEM
          }
      });}

      return true;
  }

  async incrementMessageViews(messageIds: number[]) {
    if (messageIds.length === 0) return true;

    const firstMessage = await this.prisma.message.findFirst({
        where: { id: { in: messageIds } },
        select: { conversation: { select: { type: true, id: true } } }
    });

    if (firstMessage?.conversation.type !== 'CHANNEL') return true;

    await this.prisma.message.updateMany({
        where: {
            id: { in: messageIds },
            conversationId: firstMessage.conversation.id
        },
        data: { viewsCount: { increment: 1 } }
    });
    return true;
  }
}