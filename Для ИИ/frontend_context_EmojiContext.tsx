'use client';

import React, { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from 'react'; // <--- Добавили useEffect
import EmojiPicker from '@/components/EmojiPicker';
import { EMOJI_DATA, toHex, APPLE_EMOJI_BASE_URL } from '@/lib/emoji-data'; // <--- Импортируем данные и хелперы

interface EmojiContextType {
  isOpen: boolean;
  openPicker: (anchorRef: React.RefObject<HTMLElement | null>, onSelect: (emoji: string) => void) => void;
  closePicker: () => void;
  togglePicker: (anchorRef: React.RefObject<HTMLElement | null>, onSelect: (emoji: string) => void) => void;
}

const EmojiContext = createContext<EmojiContextType | undefined>(undefined);

export function EmojiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const onSelectRef = useRef<((emoji: string) => void) | null>(null);

  // ---> НОВЫЙ КОД ДЛЯ ПРЕДЗАГРУЗКИ <---
  useEffect(() => {
    // Эта функция запустится один раз при загрузке приложения
    const preloadEmojis = () => {
      console.log('Preloading emoji images into cache...');
      EMOJI_DATA.forEach(category => {
        category.emojis.forEach(emoji => {
          if (/^[a-z0-9_]+$/i.test(emoji)) return; // Пропускаем некорректные строки, если есть
          
          const hex = toHex(emoji);
          if (hex) {
            // Создаем новый объект Image
            const img = new Image();
            // Назначаем ему src. Браузер начнет загрузку в фоновом режиме.
            img.src = `${APPLE_EMOJI_BASE_URL}${hex}.png`;
          }
        });
      });
    };

    // Запускаем предзагрузку
    preloadEmojis();
    
  }, []); // Пустой массив зависимостей означает "запустить только один раз"
  // --------------------------------------

  const openPicker = useCallback((anchorRef: React.RefObject<HTMLElement | null>, onSelect: (emoji: string) => void) => {
    if (anchorRef.current) {
      setAnchorElement(anchorRef.current);
      onSelectRef.current = onSelect;
      setIsOpen(true);
    }
  }, []);

  const closePicker = useCallback(() => {
    setIsOpen(false);
  }, []);

  const togglePicker = useCallback((anchorRef: React.RefObject<HTMLElement | null>, onSelect: (emoji: string) => void) => {
    if (isOpen && anchorElement === anchorRef.current) {
      closePicker();
    } else {
      openPicker(anchorRef, onSelect);
    }
  }, [isOpen, anchorElement, closePicker, openPicker]);

  const handleEmojiSelect = (emoji: string) => {
    if (onSelectRef.current) {
      onSelectRef.current(emoji);
    }
  };

  return (
    <EmojiContext.Provider value={{ isOpen, openPicker, closePicker, togglePicker }}>
      {children}
      <EmojiPicker 
        isOpen={isOpen} 
        onClose={closePicker} 
        onEmojiClick={handleEmojiSelect}
        anchorElement={anchorElement} 
      />
    </EmojiContext.Provider>
  );
}

export function useEmojiPicker() {
  const context = useContext(EmojiContext);
  if (!context) {
    throw new Error('useEmojiPicker must be used within an EmojiProvider');
  }
  return context;
}