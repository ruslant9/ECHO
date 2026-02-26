'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function Tooltip({ children, content, delay = 500, position = 'top', className = '' }: TooltipProps) {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0, left = 0;
      const OFFSET = 8;
      
      switch (position) {
        case 'bottom':
          top = rect.bottom + window.scrollY + OFFSET;
          left = rect.left + rect.width / 2 + window.scrollX;
          break;
        case 'left':
          top = rect.top + rect.height / 2 + window.scrollY;
          left = rect.left + window.scrollX - OFFSET; // ИСПРАВЛЕНО: Добавлен отступ
          break;
        case 'right':
          top = rect.top + rect.height / 2 + window.scrollY;
          left = rect.right + window.scrollX + OFFSET; // ИСПРАВЛЕНО: Добавлен отступ
          break;
        case 'top':
        default:
          top = rect.top + window.scrollY - OFFSET;
          left = rect.left + rect.width / 2 + window.scrollX;
          break;
      }
      setCoords({ top, left });
    }

    timerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpen(false);
  };

   const transformClasses = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    // --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
    // БЫЛО: left: '-translate-x-full -translate-y-1/2 -mr-2',
    // СТАЛО:
    left: '-translate-x-full -translate-y-1/2', 
    
    // БЫЛО: right: '-translate-y-1/2 -ml-2',
    // СТАЛО:
    right: '-translate-y-1/2', 
    // ----------------------
  };
  
  const arrowPositionClasses = {
    top: 'rotate-45 border-b border-r -bottom-1.5 left-1/2 -translate-x-1/2',
    bottom: 'rotate-45 border-t border-l -top-1.5 left-1/2 -translate-x-1/2',
    left: 'rotate-45 border-t border-r -right-1.5 top-1/2 -translate-y-1/2',
    right: 'rotate-45 border-b border-l -left-1.5 top-1/2 -translate-y-1/2',
  };
  
  const arrowBgClasses = isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200';

  const tooltipContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            zIndex: 10002,
            pointerEvents: 'none',
          }}
          className={`rounded-lg shadow-lg backdrop-blur-sm border p-2 text-sm whitespace-nowrap
            ${isDarkMode ? 'bg-zinc-800/90 border-zinc-700 text-zinc-100' : 'bg-white/90 border-zinc-200 text-zinc-900'}
            ${transformClasses[position]}
          `}
        >
          <div className={`absolute w-3 h-3 ${arrowPositionClasses[position]} ${arrowBgClasses}`} />
          <div className="relative z-10 font-medium">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isMounted ? createPortal(tooltipContent, document.getElementById('portals') || document.body) : null}
    </div>
  );
}