// frontend/components/profile/VibesGrid.tsx
'use client';

import Link from 'next/link';
import { Play, Trash2 } from 'lucide-react';
import { formatViewsCount } from '@/lib/format-number';

interface VibesGridProps {
  vibes: any[];
  isMyProfile?: boolean;
  onDeleteVibe?: (id: number) => void;
  emptyMessage?: string;
}

export default function VibesGrid({ vibes, isMyProfile, onDeleteVibe, emptyMessage = "Нет вайбов" }: VibesGridProps) {
  if (!vibes || vibes.length === 0) {
    return <div className="py-20 text-center text-zinc-500">{emptyMessage}</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-1 md:gap-4 animate-in fade-in duration-500 pb-20">
      {vibes.map((vibe) => (
        <div key={vibe.id} className="relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden group hover:ring-2 hover:ring-lime-400 transition-all">
          <Link href={`/dashboard/vibes?vibeId=${vibe.id}`} className="block w-full h-full cursor-pointer">
            <video 
              src={vibe.videoUrl.startsWith('http') ? vibe.videoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${vibe.videoUrl}`} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md">
              <Play size={12} fill="currentColor" />
              {formatViewsCount(vibe.viewsCount)}
            </div>
          </Link>

          {isMyProfile && onDeleteVibe && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteVibe(vibe.id);
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:scale-110 transition-all z-10 cursor-pointer"
              title="Удалить вайб"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}