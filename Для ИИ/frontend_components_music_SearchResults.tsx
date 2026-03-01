'use client';

import { motion } from 'framer-motion';
import { Search, ListMusic } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar-url';
import TrackRow from './TrackRow';

interface SearchResultsProps {
  searchResults: any;
  searchQuery: string;
  hasSearchResults: boolean;
  isDarkMode: boolean;
  openArtist: (id: number) => void;
  openAlbum: (id: number) => void;
  openPlaylist: (id: number) => void;
  handleLikeToggle: () => void;
}

export default function SearchResults({ searchResults, searchQuery, hasSearchResults, isDarkMode, openArtist, openAlbum, openPlaylist, handleLikeToggle }: SearchResultsProps) {
  if (!hasSearchResults && searchQuery.length >= 2) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 opacity-60 flex flex-col items-center">
        <div className={`p-6 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
          <Search size={48} className="text-zinc-500" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold mb-1">Найдите свой ритм</h3>
        <p className="text-sm font-medium text-zinc-500 max-w-xs">Ничего не найдено по вашему запросу.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* АРТИСТЫ */}
      {searchResults.artists.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Артисты</h3>
          <div className="flex gap-4 overflow-x-auto pt-2 pb-4 no-scrollbar px-1">
            {searchResults.artists.map((artist: any) => (
              <div key={artist.id} onClick={() => openArtist(artist.id)} className="flex flex-col items-center gap-2 cursor-pointer group min-w-[100px]">
                <div className="w-24 h-24 rounded-full shadow-lg border border-white/10 bg-zinc-800 relative z-0 transition-transform duration-300 group-hover:scale-105">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {artist.avatar ? (
                      <img src={getAvatarUrl(artist.avatar) || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-2xl">{artist.name[0]}</div>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-bold text-center truncate w-full ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{artist.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* АЛЬБОМЫ */}
      {searchResults.albums.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Альбомы</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {searchResults.albums.map((album: any) => (
              <div key={album.id} onClick={() => openAlbum(album.id)} className="cursor-pointer group">
                <div className="aspect-square rounded-xl overflow-hidden mb-2 shadow-md bg-zinc-800 border border-white/5">
                  {album.coverUrl ? (
                    <img src={getAvatarUrl(album.coverUrl) || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-2xl">{album.title[0]}</div>
                  )}
                </div>
                <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{album.title}</p>
                <p className="text-xs text-zinc-500 truncate">{album.artist.name} • {album.year}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* ПЛЕЙЛИСТЫ */}
      {searchResults.playlists.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Плейлисты</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {searchResults.playlists.map((pl: any) => (
              <div key={pl.id} onClick={() => openPlaylist(pl.id)} className="cursor-pointer group">
                <div className="aspect-square rounded-xl overflow-hidden mb-2 shadow-md bg-zinc-800 border border-white/5">
                  {pl.coverUrl ? (
                    <img src={getAvatarUrl(pl.coverUrl) || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600"><ListMusic size={32}/></div>
                  )}
                </div>
                <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{pl.title}</p>
                <p className="text-xs text-zinc-500 truncate">Автор: {pl.owner.name || pl.owner.username}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ТРЕКИ */}
      {searchResults.tracks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Треки</h3>
          <div className="space-y-1">
            {searchResults.tracks.map((track: any) => (
              <TrackRow key={track.id} track={track} onLikeToggle={handleLikeToggle} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}