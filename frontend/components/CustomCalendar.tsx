'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface CustomCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  timeLabel?: string; // <-- Добавлено
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CustomCalendar({ value, onChange, minDate = new Date(), timeLabel = 'Время' }: CustomCalendarProps) { // <-- Добавлено
  const { isDarkMode } = useTheme();
  
  const [viewDate, setViewDate] = useState(value);
  const [direction, setDirection] = useState(0);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  
  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const changeMonth = (dir: number) => {
    setDirection(dir);
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + dir);
    setViewDate(newDate);
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(value);
    newDate.setFullYear(viewDate.getFullYear());
    newDate.setMonth(viewDate.getMonth());
    newDate.setDate(day);
    
    const now = new Date();
    const isToday = newDate.toDateString() === now.toDateString();
    
    if (isToday) {
        if (newDate.getTime() < now.getTime()) {
            newDate.setHours(now.getHours());
            newDate.setMinutes(now.getMinutes());
        }
    }
    
    onChange(newDate);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
    let num = parseInt(val);
    if (isNaN(num)) return;

    const newDate = new Date(value);
    const now = new Date();
    const isToday = newDate.toDateString() === now.toDateString();

    if (type === 'hours') {
        if (num > 23) num = 23;
        if (num < 0) num = 0;
        
        if (isToday && num < now.getHours()) {
            num = now.getHours();
        }
        
        newDate.setHours(num);
        
        if (isToday && num === now.getHours() && newDate.getMinutes() < now.getMinutes()) {
            newDate.setMinutes(now.getMinutes());
        }

    } else {
        if (num > 59) num = 59;
        if (num < 0) num = 0;
        
        if (isToday && newDate.getHours() === now.getHours() && num < now.getMinutes()) {
            num = now.getMinutes();
        }
        
        newDate.setMinutes(num);
    }
    onChange(newDate);
  };

  const daysInMonth = getDaysInMonth(viewDate);
  const firstDay = getFirstDayOfMonth(viewDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 20 : -20, opacity: 0 }),
  };

  return (
    <div className={`p-4 rounded-xl border select-none ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}>
      
      <div className="flex items-center justify-between mb-4">
        <span className={`font-bold capitalize ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <div className="flex gap-1">
          <button onClick={() => changeMonth(-1)} className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => changeMonth(1)} className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className={`text-center text-xs font-bold ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden min-h-55px">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={viewDate.getMonth()}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="grid grid-cols-7 gap-1"
          >
            {blanks.map(i => <div key={`blank-${i}`} />)}

            {days.map(day => {
              const currentDayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, 23, 59, 59);
              const isPast = currentDayDate < minDate; 
              const isSelected = 
                value.getDate() === day && 
                value.getMonth() === viewDate.getMonth() && 
                value.getFullYear() === viewDate.getFullYear();
              
              const isToday = 
                new Date().getDate() === day &&
                new Date().getMonth() === viewDate.getMonth() &&
                new Date().getFullYear() === viewDate.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => !isPast && handleDateClick(day)}
                  disabled={isPast}
                  className={`
                    h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all relative
                    ${isSelected 
                        ? 'bg-lime-400 text-black font-bold shadow-[0_0_10px_rgba(163,230,53,0.4)]' 
                        : isPast 
                            ? (isDarkMode ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-300 cursor-not-allowed')
                            : (isDarkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100')
                    }
                    ${isToday && !isSelected ? (isDarkMode ? 'border border-zinc-600' : 'border border-zinc-300') : ''}
                  `}
                >
                  {day}
                  {isToday && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-lime-500"></div>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={`mt-4 pt-4 border-t flex items-center justify-between ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Clock size={16} />
            <span>{timeLabel}</span> {/* <-- Использовано свойство */}
        </div>
        <div className={`flex items-center gap-2 p-1 rounded-lg border ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
            <input 
                type="text" 
                value={String(value.getHours()).padStart(2, '0')}
                onChange={(e) => handleTimeChange('hours', e.target.value)}
                onFocus={(e) => e.target.select()}
                className={`w-8 text-center bg-transparent outline-none ${isDarkMode ? 'text-white' : 'text-zinc-500'}`}
                maxLength={2}
            />
            <span className="text-zinc-400">:</span>
            <input 
                type="text" 
                value={String(value.getMinutes()).padStart(2, '0')}
                onChange={(e) => handleTimeChange('minutes', e.target.value)}
                onFocus={(e) => e.target.select()}
                className={`w-8 text-center bg-transparent outline-none ${isDarkMode ? 'text-white' : 'text-zinc-500'}`}
                maxLength={2}
            />
        </div>
      </div>
    </div>
  );
}