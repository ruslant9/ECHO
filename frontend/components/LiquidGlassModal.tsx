'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect, useState, useRef, useId } from 'react';

interface LiquidGlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export default function LiquidGlassModal({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}: LiquidGlassModalProps) {
  const [mounted, setMounted] = useState(false);
  const mouseDownTarget = useRef<EventTarget | null>(null);
  
  // Создаем уникальный ID для SVG фильтра, чтобы избежать конфликтов
  const filterId = `lg-dist-${useId()}`;

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownTarget.current = e.target;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
      onClose();
    }
    mouseDownTarget.current = null;
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          {/* 1. Overlay (фон) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          />

          {/* 2. Glass Container (анимированный контейнер) */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidth} rounded-3xl overflow-hidden shadow-2xl
              isolate text-zinc-900 dark:text-zinc-100 ${className}`}
          >
            {/* 
              Слои для эффекта "жидкого стекла" 
              Структура точно повторяет ваш пример для корректной работы
            */}

            {/* Слой 1: Фильтр искажения и размытия фона */}
            <div
              className="absolute inset-0 z-0 backdrop-blur-xl" // backdrop-blur для "морозного" эффекта
              style={{ filter: `url(#${filterId})` }} // SVG-фильтр для "жидкого" искажения
            />

            {/* Слой 2: Цветная подложка */}
            <div
              className="absolute inset-0 z-10 bg-[rgba(255,255,255,0.05)] dark:bg-[rgba(255,255,255,0.05)]"
            />

            {/* Слой 3: Блики и внутренние тени по краям */}
            <div
              className="absolute inset-0 z-20 rounded-3xl pointer-events-none"
              style={{
                boxShadow:
                  'inset 1px 1px 0 rgba(255,255,255,0.6), inset 0 0 5px rgba(255,255,255,0.4)',
              }}
            />

            {/* Слой 4: Контент */}
            <div className="relative z-30 w-full max-h-[90vh] flex flex-col rounded-3xl overflow-hidden">
              {children}
            </div>

            {/* 
              Определение SVG-фильтра (скрыто, но необходимо)
              Создает эффект "ряби" на воде или искажения в стекле.
            */}
            <svg className="absolute w-0 h-0">
              <filter id={filterId}>
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.01 0.01" // Размер "волн"
                  numOctaves="2" // Детализация
                  seed="5" // Случайный рисунок
                  result="noise"
                />
                <feGaussianBlur in="noise" stdDeviation="1.5" result="blurred" />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="blurred"
                  scale="50" // Сила искажения
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </svg>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}