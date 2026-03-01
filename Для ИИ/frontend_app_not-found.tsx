'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  const { isDarkMode } = useTheme();
  const router = useRouter();

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center font-sans p-6 text-center transition-colors
      ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}
    >
      {/* Фоновые элементы для красоты */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${isDarkMode ? '#a3e635' : '#a3e635'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#a3e635' : '#a3e635'} 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-lime-400/10 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Анимированный Смайлик */}
        <motion.div 
            animate={{ y: [-5, 5] }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 3 }}
            className="relative w-32 h-32 mb-8"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full text-lime-400/50 drop-shadow-2xl">
            <path d="M45.7,-76.3C58.9,-69.3,69.1,-55.6,76.3,-41.2C83.5,-26.8,87.7,-11.7,85.6,2.4C83.5,16.5,75.1,29.6,65.3,40.6C55.6,51.6,44.5,60.5,32.3,66.8C20.1,73.1,6.8,76.8,-5.6,75.5C-18,74.2,-29.6,67.9,-40.4,59.8C-51.2,51.7,-61.2,41.8,-69.1,29.9C-77,18,-82.8,4.1,-80.7,-8.6C-78.6,-21.3,-68.6,-32.8,-57.4,-41.8C-46.2,-50.8,-33.8,-57.3,-21.3,-64.8C-8.8,-72.3,3.8,-80.8,17.2,-80.6C30.6,-80.4,44.8,-71.5,45.7,-76.3Z" transform="translate(100 100) scale(1.1)" fill="currentColor" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <div className="flex gap-6 mb-2">
                <div className="w-4 h-4 rounded-full bg-white/50" />
                <div className="w-4 h-4 rounded-full bg-white/50" />
            </div>
            <svg viewBox="0 0 100 50" className="w-16 h-8">
                <path d="M5 45 Q 50 10, 95 45" stroke="rgba(255,255,255,0.5)" strokeWidth="6" fill="transparent" strokeLinecap="round" />
            </svg>
          </div>
        </motion.div>

        {/* Текстовый блок */}
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-linear-to-r from-zinc-400 to-zinc-600 dark:from-zinc-700 dark:to-zinc-500">404</h1>
        <h2 className="text-2xl font-bold mt-4">Страница не найдена</h2>
        <p className="mt-2 text-zinc-500 max-w-sm">
          Ой! Кажется, вы свернули не туда. Страница, которую вы ищете, не существует или была перемещена.
        </p>

        {/* Кнопки действий */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.back()}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all border
                ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800 text-white' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-900'}`}
          >
            <ArrowLeft size={16} />
            Вернуться назад
          </button>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-lime-400 text-black rounded-full font-bold hover:bg-lime-500 transition-colors text-sm"
          >
            <Home size={16} />
            На главную
          </Link>
        </div>
      </motion.div>
    </div>
  );
}