// frontend/components/PostImages.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface PostImagesProps {
  images: string[];
  onImageClick: (index: number) => void;
}

export default function PostImages({ images, onImageClick }: PostImagesProps) {
  const { isDarkMode } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  // === ЛОГИКА ДЛЯ 1-3 ИЗОБРАЖЕНИЙ (СЕТКА) ===
  if (images.length <= 3) {
    return (
      <div className={`mt-2 grid gap-0.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.map((img, idx) => (
          <div 
            key={idx} 
            // Всегда квадратный контейнер с черным фоном
            className={`relative aspect-square overflow-hidden cursor-pointer group bg-black 
                ${images.length === 3 && idx === 0 ? 'col-span-2' : ''}`} // col-span-2 only if 3 images and first one
            onClick={() => onImageClick(idx)}
          >
            <img 
              src={img} 
              alt="Post content" 
              // object-contain, чтобы не обрезать, а добавлять черные полосы
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ))}
      </div>
    );
  }

  // === ЛОГИКА ДЛЯ > 3 ИЗОБРАЖЕНИЙ (СЛАЙДЕР В ПОСТЕ) ===
  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="mt-2 relative group select-none">
      {/* Контейнер картинки */}
      <div 
        // Всегда квадратный контейнер с черным фоном
        className="relative aspect-square w-full overflow-hidden rounded-xl cursor-pointer bg-black"
        onClick={() => onImageClick(currentIndex)}
      >
        <AnimatePresence mode='wait'>
            <motion.img 
                key={currentIndex}
                src={images[currentIndex]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                // object-contain, чтобы не обрезать, а добавлять черные полосы
                className="w-full h-full object-contain" 
                alt={`Slide ${currentIndex}`}
            />
        </AnimatePresence>

        {/* Стрелки навигации (появляются при наведении) */}
        <button 
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100"
        >
            <ChevronLeft size={20} />
        </button>
        <button 
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100"
        >
            <ChevronRight size={20} />
        </button>
      </div>

      {/* Точки внизу */}
      <div className="flex justify-center gap-1.5 mt-3 px-2 flex-wrap">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); handleDotClick(idx); }}
            className={`h-2 rounded-full transition-all duration-300 
              ${currentIndex === idx 
                ? 'w-6 bg-lime-400' 
                : (isDarkMode ? 'w-2 bg-zinc-700 hover:bg-zinc-600' : 'w-2 bg-zinc-300 hover:bg-zinc-400')
              }`}
          />
        ))}
      </div>
    </div>
  );
}