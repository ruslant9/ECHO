// frontend/components/ThemeToggle.tsx
'use client';

import { motion } from 'framer-motion';

interface ThemeToggleProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export default function ThemeToggle({ isDarkMode, toggleTheme }: ThemeToggleProps) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        toggleTheme();
      }}
      className={`relative w-full h-12 rounded-xl cursor-pointer overflow-hidden transition-colors duration-500 border
        ${isDarkMode ? 'bg-[#0f172a] border-zinc-700' : 'bg-[#60a5fa] border-blue-300'}`}
    >
      {/* --- ФОН: ЗВЕЗДЫ (для темной темы) --- */}
      <motion.div
        initial={false}
        animate={{ opacity: isDarkMode ? 1 : 0, y: isDarkMode ? 0 : 20 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-2 left-10 w-1 h-1 bg-white rounded-full opacity-80" />
        <div className="absolute top-5 left-20 w-0.5 h-0.5 bg-white rounded-full opacity-60" />
        <div className="absolute bottom-3 left-14 w-1 h-1 bg-white rounded-full opacity-70" />
        <div className="absolute top-2 right-4 w-0.5 h-0.5 bg-white rounded-full opacity-90" />
        <div className="absolute bottom-4 right-10 w-1 h-1 bg-white rounded-full opacity-50" />
      </motion.div>

      {/* --- ФОН: ОБЛАКА (для светлой темы) --- */}
      <motion.div
        initial={false}
        animate={{ opacity: isDarkMode ? 0 : 1, y: isDarkMode ? 20 : 0 }}
        className="absolute inset-0 pointer-events-none"
      >
        <svg className="absolute bottom-0 left-4 text-white/40 w-12 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.5,14c-1.7,0-3.1,1.1-3.4,2.5c-0.2-0.1-0.5-0.1-0.7-0.1c-1.9,0-3.5,1.3-3.9,3.1c-0.3-0.1-0.7-0.1-1-0.1 c-2.5,0-4.5,2-4.5,4.5h18c0-2.5-2-4.5-4.5-4.5V14z" />
        </svg>
        <svg className="absolute top-2 right-6 text-white/30 w-8 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.5,12c-1.7,0-3.2,0.9-4.1,2.3c-0.3-0.2-0.7-0.3-1.1-0.3c-1.8,0-3.3,1.3-3.7,3c-0.3-0.1-0.6-0.1-0.9-0.1 c-2.2,0-4,1.8-4,4h18c0-2.2-1.8-4-4-4V12z" />
        </svg>
      </motion.div>

      {/* --- КРУГ (СОЛНЦЕ / ЛУНА) --- */}
      <motion.div
        layout
        className="absolute top-1 bottom-1 w-10 h-10 rounded-full shadow-lg flex items-center justify-center z-10"
        initial={false}
        animate={{
          // X: 12px (слева) или 180px (справа) - подогнано под ширину выпадающего меню w-64
          x: isDarkMode ? 180 : 6, 
          backgroundColor: isDarkMode ? '#e4e4e7' : '#fcd34d',
          boxShadow: isDarkMode 
            ? 'inset -4px -4px 6px rgba(0,0,0,0.2), 0 0 10px rgba(255,255,255,0.1)' 
            : 'inset -2px -2px 6px rgba(217,119,6,0.5), 0 0 15px rgba(252,211,77,0.6)'
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <motion.div animate={{ opacity: isDarkMode ? 1 : 0 }} className="absolute inset-0">
           <div className="absolute top-2 left-3 w-2 h-2 bg-zinc-300 rounded-full opacity-60" />
           <div className="absolute bottom-3 right-2 w-1.5 h-1.5 bg-zinc-300 rounded-full opacity-60" />
           <div className="absolute top-5 left-5 w-1 h-1 bg-zinc-300 rounded-full opacity-60" />
        </motion.div>
      </motion.div>

      {/* --- ТЕКСТОВЫЕ ПОДПИСИ --- */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        {/* ЛЕВАЯ СТОРОНА: Показываем "НОЧЬ", если включен Dark Mode (Луна уехала вправо) */}
        <span className={`text-[10px] font-bold tracking-widest transition-opacity duration-300 ${isDarkMode ? 'opacity-100 text-white/90 drop-shadow-md ml-2' : 'opacity-0'}`}>
          НОЧЬ
        </span>

        {/* ПРАВАЯ СТОРОНА: Показываем "ДЕНЬ", если выключен Dark Mode (Солнце слева) */}
        <span className={`text-[10px] font-bold tracking-widest transition-opacity duration-300 ${!isDarkMode ? 'opacity-100 text-white/90 drop-shadow-md mr-2' : 'opacity-0'}`}>
          ДЕНЬ
        </span>
      </div>
    </div>
  );
}