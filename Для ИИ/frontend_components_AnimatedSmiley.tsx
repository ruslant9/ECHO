// frontend/components/AnimatedSmiley.tsx
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

  useEffect(() => {
    if (smileyRef.current) {
      if (mood === 'phone') { eyeX.set(0); eyeY.set(15); return; }
      if (mood === 'sad') { eyeX.set(0); eyeY.set(10); return; }
      if (mood === 'shield') { eyeX.set(0); eyeY.set(-5); return; }

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
              d="M42.9,-70.6C54.8,-63.9,63.1,-50.4,70.2,-36C77.3,-21.6,83.2,-6.3,80.7,8C78.2,22.3,67.3,35.6,55.3,45.8C43.3,56,31.4,63.1,17.9,68.9C4.4,74.7,-10.7,79.2,-25.1,76C-39.5,72.8,-53.2,61.9,-63.6,48.6C-74,35.3,-81.1,19.6,-82.3,3.3C-83.5,-13,-78.8,-29.9,-69.1,-43.3C-59.4,-56.7,-44.7,-66.6,-30.3,-71.4C-15.9,-76.2,-1.6,-75.9,13,-73.4C27.6,-70.9,42.9,-70.6,42.9,-70.6Z"
              transform="translate(100 100) scale(1.15)"
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

      {/* УВЕЛИЧЕН ОТСТУП С mt-8 ДО mt-20 */}
      <div className="relative z-10 text-center h-6 mt-20">
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