'use client';
import React, { useMemo, CSSProperties, useEffect } from 'react';
import { getAvatarUrl } from '@/lib/avatar-url'; 

interface AvatarProps {
  username?: string;
  name?: string; // <--- Добавляем проп name
  url?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  style?: CSSProperties;
}

export default function Avatar({ username = '?', name, url, size = 'md', className = '', style }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  
  // Сбрасываем ошибку при изменении URL
  useEffect(() => {
    setImageError(false);
  }, [url]);
  
  // Логика: если есть картинка - показываем.
  // Если нет: берем Имя. Если нет Имени - берем Никнейм.
  const displayName = name || username || '?';
  const letter = displayName[0]?.toUpperCase();

  const bgColor = useMemo(() => {
    let hash = 0;
    const str = username || '?'; // Цвет оставляем привязанным к username, чтобы он не менялся при смене имени
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 50%)`;
  }, [username]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-32 h-32 text-5xl',
    '2xl': 'w-40 h-40 text-6xl',
  };

  const avatarUrl = getAvatarUrl(url);
  
  if (avatarUrl && !imageError) {
    return (
      <img 
        src={avatarUrl} 
        alt={displayName} 
        className={`rounded-full object-cover shadow-sm shrink-0 border border-zinc-200 dark:border-zinc-800 ${sizeClasses[size]} ${className}`} 
        style={style}
        onError={() => {
          // Если изображение не загрузилось, показываем fallback
          setImageError(true);
        }}
      />
    );
  }

  return (
    <div 
      className={`rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor, ...style }} 
    >
      {letter}
    </div>
  );
}