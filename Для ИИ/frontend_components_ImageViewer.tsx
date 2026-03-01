// frontend/components/ImageViewer.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/context/ThemeContext';

// ИСПРАВЛЕНИЕ: Порт изменен с 5000 на 3400
// Также изменена переменная окружения на API_URL для единообразия с другими компонентами
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3400';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex: number;
}

export default function ImageViewer({ isOpen, onClose, images, initialIndex }: ImageViewerProps) {
  const { isDarkMode } = useTheme();
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const paginate = useCallback((newDirection: number) => {
    const newIndex = index + newDirection;
    if (newIndex >= 0 && newIndex < images.length) {
        setDirection(newDirection);
        setIndex(newIndex);
    } else if (newIndex < 0) {
        setDirection(newDirection);
        setIndex(images.length - 1);
    } else if (newIndex >= images.length) {
        setDirection(newDirection);
        setIndex(0);
    }
  }, [index, images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') paginate(-1);
      if (e.key === 'ArrowRight') paginate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, paginate]);

  if (!isOpen) return null;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 500 : -500,
      opacity: 0
    })
  };

  const counterClass = isDarkMode
    ? 'bg-black/60 text-white shadow-md'
    : 'bg-white/80 text-zinc-900 shadow-md';

  const navButtonClass = isDarkMode
    ? 'bg-white/10 hover:bg-white/20 text-white'
    : 'bg-black/10 hover:bg-black/20 text-white';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className={`absolute top-5 right-5 p-2 rounded-full transition-colors z-50 ${navButtonClass}`}
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                className={`absolute left-4 p-3 rounded-full transition-colors z-50 ${navButtonClass}`}
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); paginate(1); }}
                className={`absolute right-4 p-3 rounded-full transition-colors z-50 ${navButtonClass}`}
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-5xl p-4 flex flex-col items-center justify-center gap-4 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div
                className="relative flex items-center justify-center w-full h-full"
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.img
                  key={index}
                  // Исправленная логика URL
                  src={images[index].startsWith('http') || images[index].startsWith('data:') ? images[index] : `${BACKEND_URL}${images[index]}`}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="max-w-full max-h-[85vh] object-contain"
                  alt={`Image ${index + 1}`}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = Math.abs(offset.x) * velocity.x;
                    if (swipe < -10000) paginate(1);
                    else if (swipe > 10000) paginate(-1);
                  }}
                />
              </AnimatePresence>
            </div>
            
            {images.length > 1 && (
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${counterClass}`}>
                    {index + 1} / {images.length}
                </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}