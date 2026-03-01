// frontend/components/EmojiPicker.tsx
'use client';

import { useState, useRef, useLayoutEffect, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smile, User, Sprout, Coffee, Heart } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { EMOJI_DATA, APPLE_EMOJI_BASE_URL, toHex } from '@/lib/emoji-data';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiClick: (emoji: string) => void;
  anchorElement: HTMLElement | null;
}

export default function EmojiPicker({ isOpen, onClose, onEmojiClick, anchorElement }: EmojiPickerProps) {
  const { isDarkMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Уникальный ID для SVG-фильтра, чтобы избежать конфликтов на странице
  const filterId = `lg-dist-picker-${useId()}`;

  // Сброс категории на "Смайлики" при открытии панели
  useEffect(() => {
    if (isOpen) {
      setActiveCategory('smileys');
    }
  }, [isOpen]);

  // useLayoutEffect рассчитывает позицию ДО отрисовки кадра, убирая "прыжки"
  useLayoutEffect(() => {
    if (isOpen && anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      const pickerWidth = 320; // w-80
      const pickerHeight = 384; // h-96
      
      let left = rect.right - pickerWidth;
      // Если выходит за левый край экрана
      if (left < 10) {
          left = rect.left; 
      }
      // Если все равно не влазит (мобилки), центрируем или прибиваем к краю
      if (left < 10) left = 10;

      // Проверяем место снизу
      const spaceBelow = window.innerHeight - rect.bottom;
      let top = rect.bottom + 8 + window.scrollY;

      // Если снизу мало места (меньше высоты пикера), открываем ВВЕРХ
      if (spaceBelow < pickerHeight && rect.top > pickerHeight) {
          top = rect.top - pickerHeight - 8 + window.scrollY;
      }

      setPosition({ top, left });
    }
  }, [isOpen, anchorElement]);

  // Обработка клика вне панели
  useLayoutEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && pickerRef.current && !pickerRef.current.contains(e.target as Node) && anchorElement && !anchorElement.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorElement]);

  if (typeof document === 'undefined') return null;

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const element = document.getElementById(`emoji-category-${catId}`);
    if (element && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
            top: element.offsetTop - scrollContainerRef.current.offsetTop,
            behavior: 'smooth'
        });
    }
  };

  const getCategoryIcon = (id: string) => {
      switch(id) {
          case 'smileys': return <Smile size={20} />;
          case 'people': return <User size={20} />;
          case 'heart': return <Heart size={20} />;
          case 'nature': return <Sprout size={20} />;
          case 'food': return <Coffee size={20} />;
          default: return <Smile size={20} />;
      }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
            zIndex: 99999, // Поверх всего
          }}
          className={`relative w-80 h-96 rounded-3xl shadow-2xl overflow-hidden isolate
            ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}
        >
          {/* Слой 1: Фильтр искажения и размытия фона */}
          <div
            className="absolute inset-0 z-0 backdrop-blur-xl"
            style={{ filter: `url(#${filterId})` }}
          />

          {/* Слой 2: Цветная подложка (сделали в 2 раза прозрачнее: /20 вместо /40) */}
          <div
            className={`absolute inset-0 z-10 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}
          />

          {/* Слой 3: Блики и внутренние тени по краям */}
          <div
            className="absolute inset-0 z-20 rounded-3xl pointer-events-none"
            style={{
              boxShadow: isDarkMode 
                ? 'inset 1px 1px 0 rgba(255,255,255,0.1), inset 0 0 5px rgba(255,255,255,0.05)'
                : 'inset 1px 1px 0 rgba(255,255,255,0.6), inset 0 0 5px rgba(255,255,255,0.4)',
            }}
          />

          {/* Слой 4: Контент пикера (z-30) */}
          <div className="relative z-30 w-full h-full flex flex-col">
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">Эмодзи</span>
                {/* Добавлен cursor-pointer */}
                <button 
                    onClick={onClose}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-black/5 text-zinc-500'}`}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Emojis Grid */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-3 scroll-smooth min-h-0"
            >
                {EMOJI_DATA.map((category) => (
                    <div key={category.id} id={`emoji-category-${category.id}`} className="mb-4">
                        {/* Уменьшена непрозрачность плашки категории для лучшего эффекта стекла */}
                        <div className={`text-xs font-bold mb-2 px-3 py-2 sticky top-0 z-10 backdrop-blur-md rounded-xl mx-1 shadow-sm border
                            ${isDarkMode 
                                ? 'bg-zinc-800/30 text-zinc-300 border-white/5' 
                                : 'bg-white/30 text-zinc-600 border-black/5'}`}>
                            {category.name}
                        </div>
        
                        <div className="grid grid-cols-7 gap-1">
                            {category.emojis.map((emoji, index) => {
                                if (/^[a-z0-9_]+$/i.test(emoji)) return null; 
                                const hex = toHex(emoji);
                                if (!hex) return null;

                                return (
                                    <button
                                        key={index}
                                        onMouseDown={(e) => e.preventDefault()} // Предотвращаем потерю фокуса инпута
                                        onClick={() => onEmojiClick(emoji)}
                                        className={`aspect-square flex items-center justify-center rounded-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer
                                            ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                                    >
                                        <img 
                                            src={`${APPLE_EMOJI_BASE_URL}${hex}.png`}
                                            alt={emoji}
                                            className="w-6 h-6 object-contain pointer-events-none select-none"
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className={`shrink-0 h-12 flex items-center justify-around px-2 border-t backdrop-blur-md
                 ${isDarkMode ? 'bg-black/10 border-white/10' : 'bg-white/10 border-black/5'}`}>
                {EMOJI_DATA.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => scrollToCategory(cat.id)}
                        className={`p-2 rounded-xl transition-all duration-300 cursor-pointer
                            ${activeCategory === cat.id 
                                ? (isDarkMode ? 'text-lime-400 bg-lime-400/10' : 'text-zinc-900 bg-black/5') 
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                    >
                        {getCategoryIcon(cat.id)}
                    </button>
                ))}
            </div>
          </div>

          <svg className="absolute w-0 h-0">
            <filter id={filterId}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.01 0.01"
                numOctaves="2"
                seed="5"
                result="noise"
              />
              <feGaussianBlur in="noise" stdDeviation="1.5" result="blurred" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="blurred"
                scale="50"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}