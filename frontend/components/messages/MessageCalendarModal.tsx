'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, CalendarDays, Loader } from 'lucide-react';
import { gql, useQuery } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import LiquidGlassModal from '../LiquidGlassModal';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';

const GET_CONVERSATION_STATS = gql`
  query ConversationStatsForCalendar($conversationId: Int!) {
    conversationStats(conversationId: $conversationId) {
      daily {
        date
        total
      }
    }
  }
`;

interface MessageCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  onDateSelect: (date: string) => void;
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function MessageCalendarModal({
  isOpen,
  onClose,
  conversationId,
  onDateSelect,
}: MessageCalendarModalProps) {
  const { isDarkMode } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data, loading } = useQuery(GET_CONVERSATION_STATS, {
    variables: { conversationId },
    skip: !isOpen,
    fetchPolicy: 'cache-first',
  });

  // Преобразуем массив статистики в Map для быстрого поиска: "YYYY-MM-DD" -> count
  const statsMap = useMemo(() => {
    const map = new Map<string, number>();
    let max = 0;
    if (data?.conversationStats?.daily) {
      data.conversationStats.daily.forEach((day: any) => {
        map.set(day.date, day.total);
        if (day.total > max) max = day.total;
      });
    }
    return { map, max };
  }, [data]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Вс, 1 = Пн
  // Корректируем, чтобы неделя начиналась с Пн (0 = Пн, 6 = Вс)
  const startDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = statsMap.map.get(dateStr);
    if (count) {
      onDateSelect(dateStr);
      onClose();
    }
  };

  // Генерация цвета в зависимости от активности
  const getDayStyle = (count: number, max: number) => {
    if (!count) return {};
    
    // Нормализуем активность от 0 до 1
    const intensity = Math.min(count / (max * 0.8), 1); // 0.8 чтобы "розовый" наступал чуть раньше максимума

    // Интерполяция цветов (примерная логика)
    // Низкая активность (intensity ~0.1) -> Голубой (Cyan)
    // Высокая активность (intensity ~1.0) -> Розовый (Pink/Fuchsia)
    
    // Базовые цвета в RGB
    const lowColor = { r: 34, g: 211, b: 238 }; // Cyan-400
    const highColor = { r: 236, g: 72, b: 148 }; // Pink-500

    const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * intensity);
    const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * intensity);
    const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * intensity);

    const bg = `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.25})`; // Прозрачность от 0.15 до 0.4
    const border = `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`;
    const text = isDarkMode ? '#fff' : '#000';
    const shadow = `0 0 ${5 + intensity * 15}px rgba(${r}, ${g}, ${b}, ${0.3})`;

    return {
      backgroundColor: bg,
      borderColor: border,
      color: text,
      boxShadow: shadow,
    };
  };

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--glass-reflex-dark': isDarkMode ? 2 : 1,
    '--glass-reflex-light': isDarkMode ? 0.3 : 1,
    '--saturation': '150%',
  } as React.CSSProperties;

  // Базовый стиль ячейки
  const cellBaseClass = `
    relative h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
    border border-transparent
  `;

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
       <style dangerouslySetInnerHTML={{ __html: `
        .calendar-noise {
            background-image: url(${LIQUID_GLASS_NOISE_B64});
            background-size: 100px 100px;
            mix-blend-mode: overlay;
            opacity: 0.07;
            pointer-events: none;
        }
        .liquid-btn {
          background-color: color-mix(in srgb, var(--c-glass) 10%, transparent);
          backdrop-filter: blur(8px) saturate(var(--saturation));
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 20%, transparent);
        }
      `}} />

      <div className="relative overflow-hidden" style={liquidGlassStyles}>
        {/* Хедер */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0 relative z-10">
            <div className="calendar-noise absolute inset-0" />
            <div className="flex items-center gap-2">
                <CalendarDays size={20} className="text-lime-400" />
                <h2 className="font-bold text-xl tracking-tight">Календарь</h2>
            </div>
            <button onClick={onClose} className="p-2 liquid-btn hover:bg-white/10 rounded-full transition-colors cursor-pointer relative z-20">
                <X size={20} />
            </button>
        </div>

        {/* Контент */}
        <div className="p-6 bg-black/5 relative z-10 min-h-[380px]">
           <div className="calendar-noise absolute inset-0" />
           
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center">
                 <Loader size={32} className="animate-spin text-lime-400" />
             </div>
           ) : (
             <div className="flex flex-col gap-4">
                {/* Навигация */}
                <div className="flex items-center justify-between mb-2">
                    <button onClick={handlePrevMonth} className="p-2 liquid-btn rounded-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-black text-lg uppercase tracking-wider drop-shadow-md">
                        {MONTHS[month]} <span className="text-lime-500">{year}</span>
                    </span>
                    <button onClick={handleNextMonth} className="p-2 liquid-btn rounded-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Дни недели */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="text-center text-xs font-bold opacity-50 uppercase">{day}</div>
                    ))}
                </div>

                {/* Сетка дней */}
                <div className="grid grid-cols-7 gap-2 md:gap-3 place-items-center">
                    {/* Пустые ячейки в начале */}
                    {Array.from({ length: startDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {/* Дни */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const count = statsMap.map.get(dateStr) || 0;
                        const hasMessages = count > 0;
                        const style = hasMessages ? getDayStyle(count, statsMap.max) : {};

                        return (
                            <motion.button
                                key={day}
                                onClick={() => hasMessages && handleDateClick(day)}
                                disabled={!hasMessages}
                                style={style}
                                className={`
                                    ${cellBaseClass}
                                    ${hasMessages 
                                        ? 'cursor-pointer hover:scale-110 z-10' 
                                        : 'opacity-20 cursor-default grayscale'
                                    }
                                    ${!hasMessages && (isDarkMode ? 'bg-white/5' : 'bg-black/5')}
                                `}
                                whileHover={hasMessages ? { scale: 1.15 } : {}}
                                whileTap={hasMessages ? { scale: 0.95 } : {}}
                            >
                                <span className="relative z-10">{day}</span>
                                {hasMessages && (
                                    <div className="absolute inset-0 rounded-full blur-md opacity-50" style={{ backgroundColor: style.borderColor }} />
                                )}
                            </motion.button>
                        );
                    })}
                </div>
                
                {/* Легенда */}
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-wider opacity-60">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 box-shadow-[0_0_5px_cyan]" /> Мало
                    </div>
                    <div className="w-10 h-1 bg-linear-to-r from-cyan-400 to-pink-500 rounded-full" />
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-pink-500 box-shadow-[0_0_5px_pink]" /> Много
                    </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </LiquidGlassModal>
  );
}