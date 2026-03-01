'use client';

import { useState, useId, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { createPortal } from 'react-dom';

interface CustomCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date; // Сделали опциональным
  maxDate?: Date; // ДОБАВИЛИ MAX DATE
  timeLabel?: string;
  isOpen?: boolean;
  onClose?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CustomCalendar({ value, onChange, minDate, maxDate, timeLabel = 'Время', onClose, anchorRef }: CustomCalendarProps) {
  const { isDarkMode } = useTheme();
  const filterId = `calendar-liquid-${useId()}`;
  
  const [viewDate, setViewDate] = useState(value);
  const [direction, setDirection] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 320 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const height = 380; 
      
      let top = rect.bottom + window.scrollY + 8;
      if (spaceBelow < height) {
          top = rect.top + window.scrollY - height - 8;
      }

      setCoords({
        top,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 300),
      });
    }
  }, [anchorRef]);

  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (anchorRef?.current && anchorRef.current.contains(target)) return;
          
          const calendarEl = document.getElementById(`calendar-portal-${filterId}`);
          if (calendarEl && !calendarEl.contains(target)) {
              onClose?.();
          }
      };
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef, filterId]);

  const now = new Date();
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
    onChange(newDate);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    if (val < 0) val = 0;
    if (val > 23) val = 23;
    const newDate = new Date(value);
    newDate.setHours(val);
    onChange(newDate);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    if (val < 0) val = 0;
    if (val > 59) val = 59;
    const newDate = new Date(value);
    newDate.setMinutes(val);
    onChange(newDate);
  };

  const incrementHour = () => {
    const newDate = new Date(value);
    let newHour = newDate.getHours() + 1;
    if (newHour > 23) newHour = 0;
    newDate.setHours(newHour);
    onChange(newDate);
  };

  const decrementHour = () => {
    const newDate = new Date(value);
    let newHour = newDate.getHours() - 1;
    if (newHour < 0) newHour = 23;
    newDate.setHours(newHour);
    onChange(newDate);
  };

  const incrementMinute = () => {
    const newDate = new Date(value);
    let newMin = newDate.getMinutes() + 1;
    if (newMin > 59) newMin = 0;
    newDate.setMinutes(newMin);
    onChange(newDate);
  };

  const decrementMinute = () => {
    const newDate = new Date(value);
    let newMin = newDate.getMinutes() - 1;
    if (newMin < 0) newMin = 59;
    newDate.setMinutes(newMin);
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

  const content = (
    <motion.div
      id={`calendar-portal-${filterId}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'absolute', top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }}
      className={`rounded-xl overflow-hidden border select-none isolate shadow-2xl ${isDarkMode ? 'border-zinc-700 bg-zinc-900/95' : 'border-zinc-200 bg-white/95'}`}
    >
      <div className={`relative z-30 p-4 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`font-bold capitalize ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <div className="flex gap-1">
            <button onClick={() => changeMonth(-1)} className={`p-1 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}><ChevronLeft size={20} /></button>
            <button onClick={() => changeMonth(1)} className={`p-1 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => <div key={d} className={`text-center text-xs font-bold ${isDarkMode ? 'text-white/50' : 'text-zinc-400'}`}>{d}</div>)}
        </div>

        <div className="relative overflow-hidden min-h-[180px]">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div key={viewDate.getMonth()} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="grid grid-cols-7 gap-1">
              {blanks.map(i => <div key={`blank-${i}`} />)}
              {days.map(day => {
                const currentDayDateEnd = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, 23, 59, 59);
                const currentDayDateStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, 0, 0, 0);
                
                // ЛОГИКА БЛОКИРОВКИ:
                const isTooEarly = minDate ? currentDayDateEnd < minDate : false;
                const isTooLate = maxDate ? currentDayDateStart > maxDate : false;
                const isDisabled = isTooEarly || isTooLate;

                const isSelected = value.getDate() === day && value.getMonth() === viewDate.getMonth() && value.getFullYear() === viewDate.getFullYear();
                const isToday = new Date().getDate() === day && new Date().getMonth() === viewDate.getMonth() && new Date().getFullYear() === viewDate.getFullYear();

                return (
                  <button
                    key={day}
                    onClick={() => !isDisabled && handleDateClick(day)}
                    disabled={isDisabled}
                    className={`
                      h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all relative cursor-pointer
                      ${isSelected ? 'bg-lime-400 text-black font-bold shadow-md' 
                          : isDisabled ? (isDarkMode ? 'text-white/20 cursor-not-allowed' : 'text-zinc-300 cursor-not-allowed')
                              : (isDarkMode ? 'text-white hover:bg-white/10' : 'text-zinc-900 hover:bg-zinc-100')
                      }
                      ${isToday && !isSelected ? (isDarkMode ? 'border border-white/30' : 'border border-zinc-300') : ''}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={`mt-4 pt-4 border-t flex items-center justify-between ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
          <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-white/70' : 'text-zinc-500'}`}>
            <Clock size={16} /> <span>{timeLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`flex items-center rounded-lg border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <button onClick={decrementHour} className={`px-1.5 py-1 cursor-pointer rounded-l-lg border-r text-sm ${isDarkMode ? 'hover:bg-white/10 text-white border-white/10' : 'hover:bg-zinc-200 text-zinc-900 border-zinc-200'}`}>−</button>
              <input type="text" value={String(value.getHours()).padStart(2, '0')} onChange={handleHourChange} className={`w-8 text-center bg-transparent outline-none font-mono text-sm ${isDarkMode ? 'text-white' : 'text-zinc-900'}`} maxLength={2} />
              <button onClick={incrementHour} className={`px-1.5 py-1 cursor-pointer rounded-r-lg border-l text-sm ${isDarkMode ? 'hover:bg-white/10 text-white border-white/10' : 'hover:bg-zinc-200 text-zinc-900 border-zinc-200'}`}>+</button>
            </div>
            <span className={`px-0.5 ${isDarkMode ? 'text-white/50' : 'text-zinc-400'}`}>:</span>
            <div className={`flex items-center rounded-lg border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <button onClick={decrementMinute} className={`px-1.5 py-1 cursor-pointer rounded-l-lg border-r text-sm ${isDarkMode ? 'hover:bg-white/10 text-white border-white/10' : 'hover:bg-zinc-200 text-zinc-900 border-zinc-200'}`}>−</button>
              <input type="text" value={String(value.getMinutes()).padStart(2, '0')} onChange={handleMinuteChange} className={`w-8 text-center bg-transparent outline-none font-mono text-sm ${isDarkMode ? 'text-white' : 'text-zinc-900'}`} maxLength={2} />
              <button onClick={incrementMinute} className={`px-1.5 py-1 cursor-pointer rounded-r-lg border-l text-sm ${isDarkMode ? 'hover:bg-white/10 text-white border-white/10' : 'hover:bg-zinc-200 text-zinc-900 border-zinc-200'}`}>+</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return mounted ? createPortal(<AnimatePresence>{anchorRef?.current && content}</AnimatePresence>, document.body) : null;
}