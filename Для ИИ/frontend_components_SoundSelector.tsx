'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Play, Music, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SoundOption {
  value: string;
  label: string;
}

interface SoundSelectorProps {
  options: SoundOption[];
  value: string;
  onChange: (value: string) => void;
  isDarkMode: boolean;
}

export default function SoundSelector({ options, value, onChange, isDarkMode }: SoundSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handlePreview = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    setPlayingPreview(val);
    
    const audio = new Audio(`/sounds/${val}.mp3`);
    audio.play();
    
    audio.onended = () => setPlayingPreview(null);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* --- ТРИГГЕР (КНОПКА) --- */}
     <button
  type="button"
  onClick={() => setIsOpen(!isOpen)}
  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group cursor-pointer 
    ${isDarkMode 
      ? `bg-zinc-900 border-zinc-800 ${isOpen ? 'ring-2 ring-lime-400/50 border-transparent' : 'hover:border-zinc-700'}` 
      : `bg-white border-zinc-200 ${isOpen ? 'ring-2 ring-lime-400/50 border-transparent' : 'hover:border-zinc-300 shadow-sm'}`
    }
  `}
>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-zinc-800 text-lime-400' : 'bg-lime-100 text-lime-700'}`}>
            <Music size={20} />
          </div>
          <div className="flex flex-col items-start">
            <span className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Звук уведомления
            </span>
            <span className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {selectedOption.label}
            </span>
          </div>
        </div>
        
        <ChevronDown 
          size={20} 
          className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-lime-500' : (isDarkMode ? 'text-zinc-600' : 'text-zinc-400')}`} 
        />
      </button>

      {/* --- ВЫПАДАЮЩЕЕ МЕНЮ (Раскрывается ВНИЗ) --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            // Изменено на y: -10 для вылета сверху вниз
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            // Изменено на top-full и mt-2
            className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl shadow-xl overflow-hidden border backdrop-blur-xl
              ${isDarkMode 
                ? 'bg-zinc-900/95 border-zinc-800' 
                : 'bg-white/95 border-zinc-200'
              }
            `}
          >
            <div className="p-1.5 space-y-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                const isPlaying = playingPreview === option.value;

                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group
                      ${isSelected 
                        ? (isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100') 
                        : (isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50')
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 z-10">
                      <button
                        onClick={(e) => handlePreview(e, option.value)}
                        className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95
                          ${isPlaying 
                            ? 'bg-lime-400 text-black' 
                            : (isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300')
                          }
                        `}
                      >
                        {isPlaying ? <Volume2 size={16} className="animate-pulse" /> : <Play size={16} className="ml-0.5" />}
                      </button>
                      
                      <span className={`font-medium text-sm ${isSelected ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-zinc-400' : 'text-zinc-600')}`}>
                        {option.label}
                      </span>
                    </div>

                    {isSelected && (
                      <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="text-lime-500 z-10 pr-2"
                      >
                        <Check size={18} strokeWidth={3} />
                      </motion.div>
                    )}
                    
                    {isSelected && (
                        <motion.div
                            layoutId="active-sound-bg"
                            className={`absolute inset-0 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-white shadow-sm border border-zinc-100'}`}
                            initial={false}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}