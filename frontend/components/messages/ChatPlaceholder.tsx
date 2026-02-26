'use client';

import { MessageCircle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ChatPlaceholder() {
  const { isDarkMode } = useTheme();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-60">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-pulse ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
        <MessageCircle size={48} className={isDarkMode ? 'text-zinc-700' : 'text-zinc-300'} />
      </div>
      <h3 className="text-xl font-bold mb-2">Выберите диалог</h3>
      <p className="text-zinc-500 max-w-xs">Общайтесь с друзьями, делитесь эмодзи и оставайтесь на связи.</p>
    </div>
  );
}