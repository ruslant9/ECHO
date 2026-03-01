'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext'; // <-- Импортируем useTheme

export default function LoadingScreen() {
  const { isDarkMode } = useTheme(); // <-- Получаем isDarkMode

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden font-sans ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}> {/* <-- Динамические классы */}
        {/* Фоновые элементы (сетка и свечение) */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `linear-gradient(${isDarkMode ? '#a3e635' : '#a3e635'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#a3e635' : '#a3e635'} 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150px h-150px bg-lime-400/20 rounded-full blur-[100px]" />
        
        {/* Анимация логотипа/смайлика */}
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-32 h-32"
        >
             <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-full h-full"
             >
                 <svg viewBox="0 0 200 200" className="w-full h-full text-lime-400 drop-shadow-2xl">
                     <path d="M45.7,-76.3C58.9,-69.3,69.1,-55.6,76.3,-41.2C83.5,-26.8,87.7,-11.7,85.6,2.4C83.5,16.5,75.1,29.6,65.3,40.6C55.6,51.6,44.5,60.5,32.3,66.8C20.1,73.1,6.8,76.8,-5.6,75.5C-18,74.2,-29.6,67.9,-40.4,59.8C-51.2,51.7,-61.2,41.8,-69.1,29.9C-77,18,-82.8,4.1,-80.7,-8.6C-78.6,-21.3,-68.6,-32.8,-57.4,-41.8C-46.2,-50.8,-33.8,-57.3,-21.3,-64.8C-8.8,-72.3,3.8,-80.8,17.2,-80.6C30.6,-80.4,44.8,-71.5,45.7,-76.3Z" transform="translate(100 100)" fill="currentColor" />
                 </svg>
             </motion.div>
             
             {/* Глаза внутри вращающейся формы (стабильные) */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <motion.div 
                    animate={{ scaleY: [1, 0.1, 1] }} 
                    transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                    className="flex gap-3"
                 >
                     <div className="w-3 h-3 bg-white rounded-full shadow-sm"/>
                     <div className="w-3 h-3 bg-white rounded-full shadow-sm"/>
                 </motion.div>
             </div>
        </motion.div>
        
        {/* Текст */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
        >
            <h2 className="text-xl font-bold tracking-tight">ECHO</h2>
            <p className={`text-sm font-medium mt-1 animate-pulse ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Устанавливаем соединение...</p> {/* Здесь text-zinc-500 подойдет для обоих режимов */}
        </motion.div>
    </div>
  );
}