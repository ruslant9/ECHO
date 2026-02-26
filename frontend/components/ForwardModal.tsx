'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, CheckCircle2, Circle } from 'lucide-react';
import { useQuery, gql, useMutation } from '@apollo/client';
import Avatar from './Avatar';
import { useTheme } from '@/context/ThemeContext';
import { Conversation } from '@/types/messages';
import LiquidGlassModal from './LiquidGlassModal';

const GET_CHATS_FOR_FORWARD = gql`
  query GetChatsForForward {
    conversations {
      id
      updatedAt
      isGroup
      title
      avatar
      participant { id username name avatar }
    }
  }
`;

const FORWARD_MESSAGE = gql`
  mutation ForwardMessage($messageId: Int!, $targetConversationIds: [Int!]!) {
    forwardMessage(messageId: $messageId, targetConversationIds: $targetConversationIds) {
      id
    }
  }
`;

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: number | null;
  onSuccess: () => void;
}

export default function ForwardModal({ isOpen, onClose, messageId, onSuccess }: ForwardModalProps) {
  const { isDarkMode } = useTheme();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const { data } = useQuery(GET_CHATS_FOR_FORWARD, { skip: !isOpen });
  const [forwardMessage, { loading }] = useMutation(FORWARD_MESSAGE);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleForward = async () => {
    if (!messageId || selectedIds.size === 0) return;
    try {
      await forwardMessage({
        variables: {
          messageId,
          targetConversationIds: Array.from(selectedIds),
        },
      });
      onSuccess();
      onClose();
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  const { chats, groups } = useMemo(() => {
    if (!data?.conversations) return { chats: [], groups: [] };
    const q = searchQuery.trim().toLowerCase();
    const list = data.conversations.filter((c: Conversation) => {
      if (!q) return true;
      if (c.isGroup) {
        const title = (c.title || '').toLowerCase();
        return title.includes(q);
      }
      const p = c.participant;
      return (p?.name?.toLowerCase().includes(q) || p?.username?.toLowerCase().includes(q));
    });
    const chats = list.filter((c: Conversation) => !c.isGroup);
    const groups = list.filter((c: Conversation) => !!c.isGroup);
    return { chats, groups };
  }, [data, searchQuery]);

  if (!isOpen) return null;

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-5 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
        <h2 className="font-bold text-xl tracking-tight">Переслать сообщение</h2>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
      </div>

      <div className="p-4 border-b border-white/20 dark:border-white/10 bg-black/5">
        <div className="flex items-center px-4 py-3 rounded-xl bg-black/20 border border-white/10 focus-within:border-lime-400 transition-colors">
          <Search size={20} className="text-white/50 mr-3" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Найти чат..." className="bg-transparent w-full outline-none font-medium placeholder:text-white/30" autoFocus />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 glass-scrollbar max-h-[50vh]">
        {/* Рендеринг списков (chats, groups). Используйте hover:bg-white/10 для элементов списка */}
        {/* Вместо bg-zinc-800 для выделенного элемента используйте bg-lime-400/20 border border-lime-400/50 */}
      </div>

      <div className="p-5 border-t border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
         <div className="text-sm font-medium opacity-80">
           Выбрано: <span className="font-bold text-lime-400 text-lg ml-1">{selectedIds.size}</span>
         </div>
         <button 
            onClick={handleForward} 
            disabled={selectedIds.size === 0 || loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-lime-400 text-black hover:bg-lime-500 shadow-[0_0_15px_rgba(163,230,53,0.4)] disabled:opacity-30 disabled:shadow-none disabled:bg-white/10 disabled:text-white"
         >
           {loading ? 'Отправка...' : <>Переслать <Send size={18} /></>}
         </button>
      </div>
    </LiquidGlassModal>
  );
}