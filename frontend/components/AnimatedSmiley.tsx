'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, Variants } from 'framer-motion';

export type Mood = 'neutral' | 'sad' | 'laugh' | 'dance' | 'spin' | 'explode' | 'phone' | 'pulse' | 'shield';

interface AnimatedSmileyProps {
  mood: Mood;
  onMoodChange: (mood: Mood) => void;
  isLoading: boolean;
}

const bodyVariants: Variants = {
  neutral: { scale: 1, rotate: 0, filter: "hue-rotate(0deg)" },
  sad: { scale: 0.95, rotate: -5, filter: "hue-rotate(180deg) saturate(0.5)" },
  laugh: { scale: [1, 1.1, 1], rotate: [0, -3, 3, 0], transition: { repeat: Infinity, duration: 0.5 } },
  dance: { skewX: [-5, 5, -5], scaleY: [0.95, 1.05, 0.95], transition: { repeat: Infinity, duration: 0.8 } },
  spin: { rotate: 360, transition: { duration: 1, ease: "backInOut" } },
  explode: { scale: [1, 1.2, 0.8, 1], transition: { duration: 0.4 } },
  phone: { rotate: 0 },
  shield: { scale: 1.05, rotate: 0, filter: "hue-rotate(60deg) saturate(1.2)" },
};

const mouthVariants: Variants = {
  neutral: { d: "M5 5 Q 50 60, 95 5", strokeWidth: 8 },
  sad: { d: "M5 45 Q 50 0, 95 45", strokeWidth: 8 },
  laugh: { d: "M10 10 Q 50 90, 90 10", strokeWidth: 10 },
  phone: { d: "M35 35 Q 50 50, 65 35", strokeWidth: 6 },
  explode: { d: "M40 40 Q 50 50, 60 40", strokeWidth: 4 },
  dance: { d: "M10 25 Q 50 60, 90 25", strokeWidth: 8 },
  shield: { d: "M20 20 L80 20 L80 40 L20 40 Z", strokeWidth: 4, fill: "white" },
};

export default function AnimatedSmiley({ mood, onMoodChange, isLoading }: AnimatedSmileyProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const smileyRef = useRef<HTMLDivElement>(null);

  const springConfig = { stiffness: 100, damping: 20, mass: 0.5 };
  const eyeX = useSpring(0, springConfig);
  const eyeY = useSpring(0, springConfig);

  // Случайная смена настроения (каждые 8 секунд)
  useEffect(() => {
    if (isLoading) return;
    const moods: Mood[] = ['sad', 'laugh', 'dance', 'spin', 'phone', 'pulse', 'shield'];

    const randomAction = () => {
      if (isHovering && Math.random() < 0.6) return;
      if (!isHovering && Math.random() < 0.4) {
        onMoodChange('neutral');
        return;
      }

      const nextMood = moods[Math.floor(Math.random() * moods.length)];
      onMoodChange(nextMood);

      const duration = nextMood === 'phone' ? 4000 : 2500;
      setTimeout(() => {
        if (!isLoading) onMoodChange('neutral');
      }, duration);
    };

    const interval = setInterval(randomAction, 8000);
    return () => clearInterval(interval);
  }, [isHovering, isLoading, onMoodChange]);

  // Движение глаз за курсором
  useEffect(() => {
    if (smileyRef.current) {
      if (mood === 'phone') {
        eyeX.set(0);
        eyeY.set(15);
        return;
      }
      if (mood === 'sad') {
        eyeX.set(0);
        eyeY.set(10);
        return;
      }
      if (mood === 'shield') {
        eyeX.set(0);
        eyeY.set(-5);
        return;
      }

      if (isHovering && mood === 'neutral') {
        const { left, top, width, height } = smileyRef.current.getBoundingClientRect();
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const dx = mousePosition.x - centerX;
        const dy = mousePosition.y - centerY;
        eyeX.set(Math.max(-15, Math.min(15, dx * 0.1)));
        eyeY.set(Math.max(-15, Math.min(15, dy * 0.1)));
      } else {
        eyeX.set(0);
        eyeY.set(0);
      }
    }
  }, [mousePosition, mood, isHovering, eyeX, eyeY]);

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 w-full">
      <div
        ref={smileyRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
        className="relative w-70 h-70 flex items-center justify-center perspective-[1000px] cursor-pointer"
      >
        <motion.div
          variants={bodyVariants}
          animate={mood}
          transition={{ rotate: { type: "spring", stiffness: 50 }, default: { duration: 0.5 } }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <svg
            viewBox="0 0 200 200"
            className="absolute w-[140%] h-[140%] text-lime-400 drop-shadow-2xl transition-colors duration-500"
          >
            <path
              d="M45.7,-76.3C58.9,-69.3,69.1,-55.6,76.3,-41.2C83.5,-26.8,87.7,-11.7,85.6,2.4C83.5,16.5,75.1,29.6,65.3,40.6C55.6,51.6,44.5,60.5,32.3,66.8C20.1,73.1,6.8,76.8,-5.6,75.5C-18,74.2,-29.6,67.9,-40.4,59.8C-51.2,51.7,-61.2,41.8,-69.1,29.9C-77,18,-82.8,4.1,-80.7,-8.6C-78.6,-21.3,-68.6,-32.8,-57.4,-41.8C-46.2,-50.8,-33.8,-57.3,-21.3,-64.8C-8.8,-72.3,3.8,-80.8,17.2,-80.6C30.6,-80.4,44.8,-71.5,45.7,-76.3Z"
              transform="translate(100 100) scale(1.1)"
              fill="currentColor"
            />
          </svg>

          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pt-4">
            <motion.div
              style={{ x: eyeX, y: eyeY }}
              animate={{ scaleY: mood === 'laugh' ? 0.2 : 1, scale: mood === 'sad' ? 0.9 : 1 }}
              className="flex gap-10 mb-4"
            >
              <div className="w-8 h-8 rounded-full bg-white shadow-sm" />
              <div className="w-8 h-8 rounded-full bg-white shadow-sm" />
            </motion.div>

            <div className="w-24 h-10 flex items-start justify-center overflow-visible">
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                <motion.path
                  variants={mouthVariants}
                  animate={mood}
                  initial="neutral"
                  stroke="white"
                  fill="transparent"
                  strokeLinecap="round"
                  transition={{ duration: 0.3 }}
                />
              </svg>
            </div>

            <AnimatePresence>
              {mood === 'phone' && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 20, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="absolute bottom-10 w-16 h-24 bg-zinc-900 rounded-lg border-2 border-zinc-700 flex items-center justify-center overflow-hidden shadow-2xl"
                >
                  <div className="w-full h-full bg-zinc-800 flex flex-col gap-1 p-1">
                    <motion.div
                      animate={{ y: [-10, -40] }}
                      transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                      className="flex flex-col gap-1"
                    >
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-2 w-full bg-zinc-600 rounded-sm opacity-50" />
                      ))}
                    </motion.div>
                  </div>
                  <div className="absolute -right-2 bottom-4 w-4 h-4 bg-lime-400 rounded-full" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Текст под шариком */}
      <div className="relative z-10 text-center h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={mood}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-zinc-500 font-medium text-sm max-w-sm mx-auto"
          >
            {mood === 'phone'
              ? "Смотрит мемы..."
              : mood === 'sad'
              ? "Что-то пошло не так..."
              : mood === 'laugh'
              ? "Рады вас видеть!"
              : mood === 'explode'
              ? "Взрыв эмоций!"
              : mood === 'dance'
              ? "Танцуем!"
              : mood === 'shield'
              ? "Защищаем ваши данные!"
              : "Будьте в курсе. Общайтесь."}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}