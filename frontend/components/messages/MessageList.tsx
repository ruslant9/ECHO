'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Smile, Loader2 } from 'lucide-react';
import Link from 'next/link';
import MessageBubble from './MessageBubble';
import Avatar from '@/components/Avatar';
import { Message } from '@/types/messages';

interface MessageListProps {
  messages: Message[];
  myId: number;
  isDarkMode: boolean;
  isGroup?: boolean;
  onReply: (message: Message) => void;
  onDeleteRequest: (messageId: number, type: 'ME' | 'ALL') => void;
  onEditRequest: (message: Message) => void;
  onCopyRequest: (content: string) => void;
  messageToAnimateId: number | null;
  isMessagingDisabled: boolean;
  onRetry: (message: Message) => void;
  onDeleteLocal: (messageId: number) => void;
  onPinMessage: (messageId: number) => void;
  onVisibleRangeChange?: (visibleIds: number[]) => void;
  hasPinnedMessage?: boolean;
  onForward: (message: Message) => void;
  onReactionToggled?: (messageId: number) => void;
  showUnreadBanner?: boolean;
  conversationUnreadCount?: number;
  conversationId?: number;
  hasUnreadOnOpen?: boolean;
  scrollToBottomTrigger?: number;
  messagesLoading?: boolean;
  onImageClick: (messageId: number, imageIndex: number) => void;
  isChannel?: boolean;
}

const EMPTY_PHRASES = ["Сообщений нет — напишите первым!", "Здесь пока тихо... Нарушьте тишину!"];

// Функция форматирования даты для разделителя
function formatDateDivider(createdAt: string) {
  const d = new Date(createdAt);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Сегодня';
  const yesterday = new Date(now.getTime() - 864e5).toDateString();
  if (d.toDateString() === yesterday) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function MessageList({ 
    messages, 
    myId, 
    isDarkMode,
    isGroup = false,
    onReply, 
    onDeleteRequest,
    onEditRequest,
    onCopyRequest,
    messageToAnimateId,
    isMessagingDisabled,
    onRetry,
    onDeleteLocal,
    onPinMessage,
    onVisibleRangeChange,
    hasPinnedMessage,
    onForward,
    onReactionToggled,
    showUnreadBanner = false,
    conversationUnreadCount = 0,
    conversationId,
    hasUnreadOnOpen = false,
    scrollToBottomTrigger,
    messagesLoading = false,
    onImageClick,
    isChannel = false,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastInitialScrollConvId = useRef<number | null>(null);
  const skipNextScrollToEnd = useRef(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [visibleIds, setVisibleIds] = useState<number[]>([]);

  useEffect(() => {
    if (!conversationId || !hasUnreadOnOpen || messages.length === 0) return;
    const messagesBelongToCurrentChat = messages[0]?.conversationId === conversationId;
    if (!messagesBelongToCurrentChat) return;
    if (lastInitialScrollConvId.current === conversationId) return;
    lastInitialScrollConvId.current = conversationId;
    skipNextScrollToEnd.current = true;
    const raf = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    });
    return () => cancelAnimationFrame(raf);
  }, [conversationId, hasUnreadOnOpen, messages.length, messages]);

  useEffect(() => {
    if (skipNextScrollToEnd.current) {
      skipNextScrollToEnd.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (scrollToBottomTrigger == null || scrollToBottomTrigger === 0) return;
    const raf = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [scrollToBottomTrigger]);

  useEffect(() => {
    if (!onVisibleRangeChange) return;

    if (observerRef.current) {
        observerRef.current.disconnect();
    }

    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    observerRef.current = new IntersectionObserver((entries) => {
        const ids = entries
            .filter(entry => entry.isIntersecting)
            .map(entry => Number(entry.target.getAttribute('data-id')))
            .sort((a, b) => a - b);
        if (ids.length > 0) {
            setVisibleIds(ids);
            onVisibleRangeChange(ids);
        }
    }, options);

    setTimeout(() => {
        const messageElements = document.querySelectorAll('.message-item');
        messageElements.forEach(el => observerRef.current?.observe(el));
    }, 100);

    return () => observerRef.current?.disconnect();
  }, [messages, onVisibleRangeChange]);

  const handleScrollToMessage = (messageId: number) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const firstUnreadIdx = messages.findIndex((m) => m.type !== 'SYSTEM' && m.senderId !== myId && !m.isRead);

  const showBanner = showUnreadBanner && conversationUnreadCount > 0 && firstUnreadIdx !== -1;

  return (
    <div
      ref={scrollContainerRef}
      className={`flex flex-col flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar relative
        ${hasPinnedMessage ? 'pt-16' : 'pt-4'}
        ${isDarkMode ? 'bg-black' : 'bg-white'}
      `}
    >
      {messages.length === 0 ? (
        messagesLoading ? (
          <div className="h-full flex flex-col items-center justify-center min-h-[200px]">
            <Loader2 size={40} className={`animate-spin ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`} />
            <p className={`mt-4 text-sm ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Загрузка сообщений...</p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-50 select-none">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
              <Smile size={40} className="text-zinc-400" />
            </div>
            <p className="text-zinc-500">{EMPTY_PHRASES[Math.floor(Math.random() * EMPTY_PHRASES.length)]}</p>
          </div>
        )
      ) : (
        <div className="space-y-3 pb-2">
          {messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const currentDate = new Date(msg.createdAt).toDateString();
            const prevDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;

            const showDateDivider = idx === 0 || currentDate !== prevDate;
            
            const isMe = msg.senderId === myId;
            const isNextSame = messages[idx + 1]?.senderId === msg.senderId;
            const isPrevSame = messages[idx - 1]?.senderId === msg.senderId;
            const showSenderAvatar = isGroup && !isMe && msg.type !== 'SYSTEM';
            
            const lastReadIdx = [...messages].map((m, i) => ({ m, i }))
              .filter(({ m }) => m.senderId === myId && (m.readBy?.length ?? 0) > 0 && m.type !== 'SYSTEM')
              .pop()?.i ?? -1;
            const isLastReadMessage = idx === lastReadIdx;
            const showUnreadBannerHere = showBanner && firstUnreadIdx === idx;


            const bubble = (
              <MessageBubble 
                message={msg} 
                isMe={isMe} 
                myId={myId}
                isDarkMode={isDarkMode}
                grouping={{ isNextSame, isPrevSame }}
                onReply={() => onReply(msg)}
                onEdit={() => onEditRequest(msg)}
                onDelete={(type: 'ME' | 'ALL') => onDeleteRequest(msg.id, type)}
                onCopy={() => onCopyRequest(msg.content)}
                isLastMessage={idx === messages.length - 1}
                isLastReadMessage={isLastReadMessage}
                onReplyClick={handleScrollToMessage}
                isHighlighted={highlightedMessageId === msg.id || messageToAnimateId === msg.id}
                playReactionAnimation={messageToAnimateId === msg.id}
                isMessagingDisabled={isMessagingDisabled}
                onRetry={onRetry}
                onDeleteLocal={onDeleteLocal}
                onPin={() => onPinMessage(msg.id)}
                onForward={() => onForward(msg)}
                onReactionToggled={onReactionToggled}
                onImageClick={(imgIdx: number) => onImageClick(msg.id, imgIdx)}
                isChannel={isChannel}
              />
            );


            return (
              <Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500 text-white shadow">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                  </div>
                )}
                
                {showUnreadBannerHere && (
                  <div
                    className={`py-2 px-3 rounded-lg text-center text-xs font-medium mb-2 ${
                      isDarkMode ? 'bg-sky-900/40 text-sky-200' : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    Непрочитанные сообщения
                  </div>
                )}
                <div
                  id={`message-${msg.id}`}
                  className="scroll-mt-28 message-item"
                  data-id={msg.id}
                >
                {showSenderAvatar ? (
                  <div className="flex items-end gap-2">
                    <div className="shrink-0" style={{ width: 40 }}>
                      {msg.sender ? (
                        <Link href={`/dashboard/user/${msg.sender.id}`} className="block" onClick={(e) => e.stopPropagation()}>
                          <Avatar
                            username={msg.sender.username}
                            name={msg.sender.name}
                            url={msg.sender.avatar}
                            size="sm"
                            className="align-bottom"
                          />
                        </Link>
                      ) : (
                        <Avatar
                          username="?"
                          name=""
                          url={undefined}
                          size="sm"
                          className="align-bottom opacity-70"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">{bubble}</div>
                  </div>
                ) : (
                  bubble
                )}
                </div>
              </Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}