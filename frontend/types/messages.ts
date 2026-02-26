export type Message = {
  id: number;
  content: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  senderId: number;
  conversationId: number;
  sender: {
    id: number;
    username: string;
    name?: string;
    avatar?: string;
  };
  isRead: boolean;
  replyToId?: number;
  replyTo?: { id: number; content: string; sender: { username: string; }; };
  reactions: MessageReaction[];
  status?: 'sending' | 'sent' | 'failed';
  isPinned: boolean;
  type: 'REGULAR' | 'SYSTEM';
  isAnonymous?: boolean; // Для каналов
  viewsCount?: number;   // Для каналов
  forwardedFrom?: {
    id: number;
    username: string;
    name?: string;
    avatar?: string;
  };
  readBy?: { user: { id: number; name?: string; username: string }; readAt: string }[];
};

export type MessageReaction = {
  id: number;
  emoji: string;
  userId: number;
  user: {
    id: number;
    username: string;
    name?: string;
    avatar?: string;
  };
};

export type Conversation = {
  id: number;
  updatedAt: string;
  unreadCount: number;
  isPinned: boolean;
  pinOrder?: number | null; // <-- ДОБАВЬТЕ ЭТУ СТРОКУ
  isArchived: boolean;
  mutedUntil?: string;
  isManuallyUnread: boolean;
  lastMessage?: Partial<Message>;
  isGroup?: boolean;
  type: 'DIRECT' | 'GROUP' | 'CHANNEL';
  title?: string | null;
  avatar?: string | null;
  description?: string | null;
  slug?: string | null;
  myRole?: 'ADMIN' | 'MEMBER' | 'MODERATOR';
  permissions?: { canPost: boolean }; 
  hasLeft?: boolean;
  participantsCount?: number;
  participant: {
    id: number;
    username: string;
    name?: string;
    avatar?: string;
    isOnline: boolean;
    lastOnlineAt?: string;
    amIBlocked?: boolean;
    isBlockedByMe?: boolean;
  } | null;
};