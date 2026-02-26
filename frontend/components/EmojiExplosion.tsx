'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toHex, APPLE_EMOJI_BASE_URL } from '@/lib/emoji-data'; // <--- 1. Импортируем хелперы

interface EmojiExplosionProps {
  emoji: string;
}

const PARTICLE_COUNT = 15;

const EmojiExplosion = ({ emoji }: EmojiExplosionProps) => {
  const [isVisible, setIsVisible] = useState(true);
  
  // 2. Получаем hex-код для формирования ссылки на картинку
  const hex = toHex(emoji);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 2500); 
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
            const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
            const radius = Math.random() * 80 + 40; 
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * 0.8 - 60; 
            const duration = Math.random() * 1.5 + 1; 

            return (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{
                  x: x,
                  y: [y, y + 80], 
                  scale: 0,
                  opacity: 0,
                  rotate: Math.random() * 360 - 180,
                }}
                transition={{ duration, ease: 'easeOut' }}
                className="absolute" // Убрали text-3xl, размер зададим картинке
              >
                {/* 3. Рендерим картинку вместо текста, если hex валиден */}
                {hex ? (
                  <img 
                    src={`${APPLE_EMOJI_BASE_URL}${hex}.png`} 
                    alt={emoji}
                    className="w-8 h-8 object-contain pointer-events-none select-none"
                  />
                ) : (
                  <span className="text-3xl">{emoji}</span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
};

export default EmojiExplosion;