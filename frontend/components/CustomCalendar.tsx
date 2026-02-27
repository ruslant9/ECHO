'use client';

import { useState, useId } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface CustomCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  timeLabel?: string;
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CustomCalendar({ value, onChange, minDate = new Date(), timeLabel = 'Время' }: CustomCalendarProps) {
  const { isDarkMode } = useTheme();
  const filterId = `calendar-liquid-${useId()}`;
  
  const [viewDate, setViewDate] = useState(value);
  const [direction, setDirection] = useState(0);

  const now = new Date();
  const isToday = value.toDateString() === now.toDateString();

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
    
    if (isToday) {
      if (newDate.getTime() < now.getTime()) {
        newDate.setHours(now.getHours());
        newDate.setMinutes(now.getMinutes());
      }
    }
    
    onChange(newDate);
  };

  // Обработчики времени
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    if (val < 0) val = 0;
    if (val > 23) val = 23;
    
    const newDate = new Date(value);
    if (isToday && val < now.getHours()) {
      val = now.getHours();
    }
    newDate.setHours(val);
    if (isToday && val === now.getHours() && newDate.getMinutes() < now.getMinutes()) {
      newDate.setMinutes(now.getMinutes());
    }
    onChange(newDate);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    if (val < 0) val = 0;
    if (val > 59) val = 59;
    
    const newDate = new Date(value);
    if (isToday && newDate.getHours() === now.getHours() && val < now.getMinutes()) {
      val = now.getMinutes();
    }
    newDate.setMinutes(val);
    onChange(newDate);
  };

  const incrementHour = () => {
    const newDate = new Date(value);
    let newHour = newDate.getHours() + 1;
    if (newHour > 23) newHour = 0;
    if (isToday && newHour < now.getHours()) {
      newHour = now.getHours();
    }
    newDate.setHours(newHour);
    if (isToday && newHour === now.getHours() && newDate.getMinutes() < now.getMinutes()) {
      newDate.setMinutes(now.getMinutes());
    }
    onChange(newDate);
  };

  const decrementHour = () => {
    const newDate = new Date(value);
    let newHour = newDate.getHours() - 1;
    if (newHour < 0) newHour = 23;
    if (isToday && newHour < now.getHours()) {
      newHour = now.getHours();
    }
    newDate.setHours(newHour);
    if (isToday && newHour === now.getHours() && newDate.getMinutes() < now.getMinutes()) {
      newDate.setMinutes(now.getMinutes());
    }
    onChange(newDate);
  };

  const incrementMinute = () => {
    const newDate = new Date(value);
    let newMin = newDate.getMinutes() + 1;
    if (newMin > 59) newMin = 0;
    if (isToday && newDate.getHours() === now.getHours() && newMin < now.getMinutes()) {
      newMin = now.getMinutes();
    }
    newDate.setMinutes(newMin);
    onChange(newDate);
  };

  const decrementMinute = () => {
    const newDate = new Date(value);
    let newMin = newDate.getMinutes() - 1;
    if (newMin < 0) newMin = 59;
    if (isToday && newDate.getHours() === now.getHours() && newMin < now.getMinutes()) {
      newMin = now.getMinutes();
    }
    newDate.setMinutes(newMin);
    onChange(newDate);
  };

  const handleHourWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) incrementHour();
    else if (e.deltaY > 0) decrementHour();
  };

  const handleMinuteWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) incrementMinute();
    else if (e.deltaY > 0) decrementMinute();
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
    <div
      className={`relative rounded-xl overflow-hidden border select-none isolate ${
        isDarkMode ? 'border-white/10' : 'border-black/5'
      }`}
      style={{
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <svg className="absolute w-0 h-0">
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="2" seed="5" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="50" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        className="absolute inset-0 z-0"
        style={{ filter: `url(#${filterId})` }}
      />
      <div className="absolute inset-0 z-10 bg-[rgba(255,255,255,0.02)] dark:bg-[rgba(255,255,255,0.02)]" />
      <div
        className="absolute inset-0 z-20 rounded-xl pointer-events-none"
        style={{
          boxShadow: isDarkMode
            ? 'inset 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 5px rgba(255,255,255,0.05)'
            : 'inset 0 0 0 1px rgba(0,0,0,0.05), inset 0 0 5px rgba(255,255,255,0.3)',
        }}
      />
      <div className="relative z-30 p-4">
        {/* Заголовок с месяцем и годом */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold capitalize text-white">
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1 rounded-lg transition-colors text-white/70 hover:text-white cursor-pointer hover:bg-white/10"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-1 rounded-lg transition-colors text-white/70 hover:text-white cursor-pointer hover:bg-white/10"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-bold text-white/50">
              {d}
            </div>
          ))}
        </div>

        {/* Сетка дней */}
        <div className="relative overflow-hidden min-h-[180px]">
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
                      h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all relative cursor-pointer
                      ${isSelected
                          ? 'bg-lime-400 text-black font-bold shadow-[0_0_10px_rgba(163,230,53,0.4)]'
                          : isPast
                              ? 'text-white/20 cursor-not-allowed'
                              : 'text-white hover:bg-white/10 hover:text-white'
                      }
                      ${isToday && !isSelected ? 'border border-white/30' : ''}
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

        {/* Выбор времени (компактная версия) */}
        <div className={`mt-4 pt-4 border-t flex items-center justify-between ${
          isDarkMode ? 'border-white/10' : 'border-black/5'
        }`}>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Clock size={16} />
            <span>{timeLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Часы */}
            <div className={`flex items-center rounded-lg border ${
              isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
            }`}>
              <button
                onClick={decrementHour}
                disabled={isToday && value.getHours() <= now.getHours()}
                className="px-1.5 py-1 hover:bg-white/10 text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed rounded-l-lg border-r border-white/10 text-sm"
              >
                −
              </button>
              <input
                type="text"
                value={String(value.getHours()).padStart(2, '0')}
                onChange={handleHourChange}
                onWheel={handleHourWheel}
                className="w-8 text-center bg-transparent outline-none text-white font-mono text-sm"
                maxLength={2}
              />
              <button
                onClick={incrementHour}
                className="px-1.5 py-1 hover:bg-white/10 text-white cursor-pointer rounded-r-lg border-l border-white/10 text-sm"
              >
                +
              </button>
            </div>

            <span className="text-white/50 px-0.5">:</span>

            {/* Минуты */}
            <div className={`flex items-center rounded-lg border ${
              isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
            }`}>
              <button
                onClick={decrementMinute}
                disabled={isToday && value.getHours() === now.getHours() && value.getMinutes() <= now.getMinutes()}
                className="px-1.5 py-1 hover:bg-white/10 text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed rounded-l-lg border-r border-white/10 text-sm"
              >
                −
              </button>
              <input
                type="text"
                value={String(value.getMinutes()).padStart(2, '0')}
                onChange={handleMinuteChange}
                onWheel={handleMinuteWheel}
                className="w-8 text-center bg-transparent outline-none text-white font-mono text-sm"
                maxLength={2}
              />
              <button
                onClick={incrementMinute}
                className="px-1.5 py-1 hover:bg-white/10 text-white cursor-pointer rounded-r-lg border-l border-white/10 text-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}