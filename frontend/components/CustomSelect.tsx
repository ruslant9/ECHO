'use client';

import { useState, useRef, useLayoutEffect, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDarkMode: boolean;
  className?: string; 
}

export default function CustomSelect({ options, value, onChange, placeholder, isDarkMode, className }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  // Уникальный ID для портала, чтобы избежать конфликтов при SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selectedOption = options.find(option => option.value === value) || null;

  // Вычисляем позицию при открытии
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4, // 4px отступ
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Закрытие при клике вне
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      // Ищем, был ли клик по триггеру или по выпадающему списку (он в портале, но мы можем проверить по id или просто закрыть, если не по триггеру)
      // Простой вариант: если клик не по триггеру, закрываем.
      // (Клик по опциям внутри портала обработается своим onClick)
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        // Проверяем, не кликнули ли мы внутрь самого меню (через closest)
        const target = event.target as HTMLElement;
        if (!target.closest('[data-portal-menu]')) {
             setIsOpen(false);
        }
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', () => setIsOpen(false), true); // Закрываем при скролле
    window.addEventListener('resize', () => setIsOpen(false));     // Закрываем при ресайзе

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', () => setIsOpen(false), true);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const baseClasses = `relative w-full p-3 rounded-xl border outline-none cursor-pointer flex items-center justify-between transition-colors`;
  const darkModeClasses = `border-zinc-700 focus:border-lime-400 ${isOpen ? 'border-lime-400 bg-zinc-800' : 'bg-zinc-900'}`;
  const lightModeClasses = `border-zinc-200 focus:border-lime-500 ${isOpen ? 'border-lime-500 bg-zinc-50' : 'bg-white'}`;

  // Меню выносится в портал
  const dropdownMenu = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 99999, // Максимальный z-index
          }}
          className={`rounded-xl shadow-2xl overflow-hidden border backdrop-blur-xl
            ${isDarkMode ? 'bg-zinc-900/95 border-zinc-700' : 'bg-white/95 border-zinc-200'}
          `}
          data-portal-menu // Атрибут для идентификации клика
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option.value)}
                // 👇 ДОБАВЛЕНО: cursor-pointer
                className={`w-full text-left px-3 py-2.5 text-xs font-medium flex items-center justify-between rounded-lg transition-colors cursor-pointer 
                  ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'}
                  ${selectedOption?.value === option.value ? (isDarkMode ? 'bg-lime-900/30 text-lime-400' : 'bg-lime-100 text-lime-900') : ''}
                `}
              >
                {option.label}
                {selectedOption?.value === option.value && <Check size={14} className={isDarkMode ? 'text-lime-400' : 'text-lime-600'} />}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${baseClasses} ${isDarkMode ? darkModeClasses : lightModeClasses}`}
      >
        <span className={`text-xs font-medium truncate mr-2 ${selectedOption ? (isDarkMode ? 'text-white' : 'text-black') : 'text-zinc-400 dark:text-zinc-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-lime-500' : (isDarkMode ? 'text-zinc-500' : 'text-zinc-400')}`} />
      </button>

      {/* Рендерим портал только на клиенте */}
      {mounted && createPortal(dropdownMenu, document.body)}
    </div>
  );
}