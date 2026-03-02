import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePlaylistInput, UpdatePlaylistInput } from './dto/create-playlist.input';
import { CreateArtistInput, CreateAlbumInput, CreateTrackInput } from './dto/admin-music.input';
import { CloudinaryService } from '../upload/cloudinary.service'; // Импорт

@Injectable()
export class MusicService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService // Добавьте это в конструктор
  ) {}


  // === ПОЛЬЗОВАТЕЛЬСКИЕ МЕТОДЫ ===

  async getRecommendations(userId: number, skip = 0, take = 20) {
  const tracks = await this.prisma.track.findMany({
    skip,
    take,
    include: { artist: true, featuredArtists: true },
    orderBy: { id: 'desc' }
  });
  return this.mapTracks(tracks, userId);
}

   async search(query: string, userId: number) {
  if (!query) {
    return { tracks: [], artists: [], albums: [], playlists: [] };
  }

  // Выполняем запросы
  const [tracks, artists, rawAlbums, playlists] = await this.prisma.$transaction([
    // 1. Поиск треков
    this.prisma.track.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { genre: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: { 
        artist: true, 
        album: true, 
        featuredArtists: true 
      },
      take: 15
    }),

    // 2. Поиск артистов
    this.prisma.artist.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: 10
    }),

    // 3. Поиск альбомов (берем больше результатов, чтобы было из чего фильтровать)
    this.prisma.album.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' },
      },
      include: { 
        artist: true,
        _count: {
          select: { tracks: true } // Получаем количество треков
        }
      },
      take: 50 // Берем с запасом
    }),

    // 4. Поиск плейлистов
    this.prisma.playlist.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' },
        OR: [{ isPrivate: false }, { ownerId: userId }]
      },
      include: { 
        owner: true,
        tracks: { include: { track: true } } 
      },
      take: 10
    })
  ]);

  // ФИЛЬТРАЦИЯ: Оставляем только те альбомы, где 2 трека и более
  const albums = rawAlbums
    .filter(album => album._count.tracks >= 2)
    .slice(0, 10); // Ограничиваем до 10 после фильтрации

  const tracksWithLikes = await this.mapTracks(tracks, userId);

  return {
    tracks: tracksWithLikes,
    artists,
    albums,
    playlists
  };
}

  // 1. Метод записи прослушивания
async recordPlayback(userId: number, trackId: number) {
  // Создаем запись в истории
  await this.prisma.listeningHistory.create({
    data: { userId, trackId }
  });
  return true;
}

// 2. Метод получения истории
async getMyLibrary(userId: number, skip = 0, take = 20) {
  const likes = await this.prisma.trackLike.findMany({
    where: { userId },
    skip,
    take,
    include: { track: { include: { artist: true, featuredArtists: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return this.mapTracks(likes.map(l => l.track), userId);
}

async getRecentHistory(userId: number, skip = 0, take = 20) {
  const history = await this.prisma.listeningHistory.findMany({
    where: { userId },
    skip,
    take,
    orderBy: { playedAt: 'desc' },
    include: { track: { include: { artist: true, featuredArtists: true, album: true } } }
  });
  return this.mapTracks(history.map(h => h.track), userId);
}

  async toggleLike(userId: number, trackId: number) {
    const existing = await this.prisma.trackLike.findUnique({
      where: { trackId_userId: { trackId, userId } }
    });

    if (existing) {
      await this.prisma.trackLike.delete({ where: { trackId_userId: { trackId, userId } } });
      return false;
    } else {
      await this.prisma.trackLike.create({ data: { trackId, userId } });
      return true;
    }
  }

  private async mapTracks(tracks: any[], userId: number) {
    const trackIds = tracks.map(t => t.id);
    const likes = await this.prisma.trackLike.findMany({
      where: { userId, trackId: { in: trackIds } }
    });
    const likedSet = new Set(likes.map(l => l.trackId));

    return tracks.map(t => ({
      ...t,
      isLiked: likedSet.has(t.id)
    }));
  }

  async createPlaylist(userId: number, input: CreatePlaylistInput) {
    const playlist = await this.prisma.playlist.create({
      data: {
        ownerId: userId,
        title: input.title,
        coverUrl: input.coverUrl,
        isPrivate: input.isPrivate || false,
      },
      // Возвращаем пустой массив треков сразу, чтобы GraphQL не ругался
      include: {
        tracks: true
      }
    });
    
    return { ...playlist, tracks: [] };
  }

  // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
  async getMyPlaylists(userId: number) {
    const playlists = await this.prisma.playlist.findMany({
      where: { ownerId: userId },
      include: { 
        tracks: { 
          include: { track: { include: { artist: true } } },
          orderBy: { addedAt: 'asc' } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    // Нужно преобразовать структуру, чтобы достать track из playlistTrack
    return Promise.all(playlists.map(async (pl) => {
        // Извлекаем "чистые" треки из связующей таблицы
        const rawTracks = pl.tracks.map(pt => pt.track);
        // Добавляем информацию о лайках
        const tracksWithLikes = await this.mapTracks(rawTracks, userId);
        
        return {
            ...pl,
            tracks: tracksWithLikes
        };
    }));
  }
  // -------------------------

  async getPlaylist(id: number, userId: number) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        owner: true,
        tracks: {
          include: { track: { include: { artist: true } } },
          orderBy: { addedAt: 'asc' }
        }
      }
    });

    if (!playlist) return null;
    if (playlist.isPrivate && playlist.ownerId !== userId) return null;

    // Здесь тоже нужно маппить треки, как и раньше
    const tracks = await this.mapTracks(playlist.tracks.map(pt => pt.track), userId);
    
    return { ...playlist, tracks };
  }

  async deletePlaylist(id: number, userId: number) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id } });
    if (!playlist || playlist.ownerId !== userId) throw new Error('Нет прав или плейлист не найден');
    
    await this.prisma.playlist.delete({ where: { id } });
    return true;
  }

  async updatePlaylist(userId: number, input: UpdatePlaylistInput) {
     const playlist = await this.prisma.playlist.findUnique({ where: { id: input.id } });
     if (!playlist || playlist.ownerId !== userId) throw new Error('Нет прав');

     // Обновляем и возвращаем обновленный объект с треками (пусть и пустыми или старыми, главное структура)
     const updated = await this.prisma.playlist.update({
         where: { id: input.id },
         data: {
             title: input.title,
             coverUrl: input.coverUrl
         },
         include: {
            tracks: {
                include: { track: { include: { artist: true } } }
            }
         }
     });

     const rawTracks = updated.tracks.map(pt => pt.track);
     const tracksWithLikes = await this.mapTracks(rawTracks, userId);

     return { ...updated, tracks: tracksWithLikes };
  }

  async addTrackToPlaylist(userId: number, playlistId: number, trackId: number) {
      const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist || playlist.ownerId !== userId) throw new Error('Нет прав');

      const exists = await this.prisma.playlistTrack.findUnique({
          where: { playlistId_trackId: { playlistId, trackId } }
      });
      if (exists) return false;

      // Используем транзакцию, чтобы добавить трек и обновить дату плейлиста одновременно
      await this.prisma.$transaction([
          this.prisma.playlistTrack.create({
              data: { playlistId, trackId }
          }),
          // Обновляем поле updatedAt у самого плейлиста
          this.prisma.playlist.update({
              where: { id: playlistId },
              data: { updatedAt: new Date() }
          })
      ]);
      
      return true;
  }

  async removeTrackFromPlaylist(userId: number, playlistId: number, trackId: number) {
      const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist || playlist.ownerId !== userId) throw new Error('Нет прав');

      await this.prisma.$transaction([
          this.prisma.playlistTrack.delete({
              where: { playlistId_trackId: { playlistId, trackId } }
          }),
          // Обновляем поле updatedAt
          this.prisma.playlist.update({
              where: { id: playlistId },
              data: { updatedAt: new Date() }
          })
      ]);
      
      return true;
  }

  // === АДМИНСКИЕ МЕТОДЫ ===

  async createArtist(input: CreateArtistInput) {
    return this.prisma.artist.create({
      data: {
        name: input.name,
        bio: input.bio,
        avatar: input.avatar,
      },
    });
  }

  async createAlbum(input: CreateAlbumInput) {
    const artist = await this.prisma.artist.findUnique({ where: { id: input.artistId } });
    if (!artist) throw new NotFoundException('Артист не найден');

    return this.prisma.album.create({
      data: {
        title: input.title,
        artistId: input.artistId,
        coverUrl: input.coverUrl,
        genre: input.genre,
        releaseDate: input.releaseDate,
        year: input.year,
      },
    });
  }

  async createTrack(input: CreateTrackInput) {
    const artist = await this.prisma.artist.findUnique({ where: { id: input.artistId } });
    if (!artist) throw new NotFoundException('Главный артист не найден');

    return this.prisma.track.create({
      data: {
        title: input.title,
        url: input.url,
        duration: input.duration,
        coverUrl: input.coverUrl,
        genre: input.genre,
        releaseDate: input.releaseDate,
        artistId: input.artistId,
        albumId: input.albumId,
        featuredArtists: {
          connect: input.featuredArtistIds?.map(id => ({ id })) || [],
        },
      },
      include: {
        artist: true,
        album: true,
        featuredArtists: true,
      }
    });
  }

  async searchArtistsForAdmin(query: string) {
    return this.prisma.artist.findMany({
      where: query ? { name: { contains: query, mode: 'insensitive' } } : undefined,
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getArtist(id: number) {
  return this.prisma.artist.findUnique({ 
    where: { id },
    include: {
      albums: {
        // ДОБАВЛЯЕМ СОРТИРОВКУ ЗДЕСЬ
        orderBy: [
          { releaseDate: 'desc' },
          { year: 'desc' }
        ],
        include: { tracks: { select: { id: true } } }
      },
      featuredInAlbums: {
        // ДОБАВЛЯЕМ СОРТИРОВКУ И ЗДЕСЬ
        orderBy: [
          { releaseDate: 'desc' },
          { year: 'desc' }
        ],
        include: { tracks: { select: { id: true } } }
      },
    }
  });
}

 async getAlbum(id: number, userId: number) {
    const album = await this.prisma.album.findUnique({
    where: { id },
    include: {
      artist: true,
      featuredArtists: true, // <--- ЭТО ДОЛЖНО БЫТЬ ТУТ
      tracks: {
        include: { 
          artist: true,
          featuredArtists: true, 
          album: true            
        },
        orderBy: { trackNumber: 'asc' }
      }
    }
  });
    
    if (!album) return null;
    const tracksWithLikes = await this.mapTracks(album.tracks, userId);
    return { ...album, tracks: tracksWithLikes };
  }

  async getArtistTopTracks(artistId: number, userId: number) {
  const tracks = await this.prisma.track.findMany({
    where: { 
      OR: [
        { artistId },
        { featuredArtists: { some: { id: artistId } } }
      ]
    },
    include: { 
      artist: true,
      featuredArtists: true,
      album: true 
    },
    // СОРТИРУЕМ ТРЕКИ ПО ДАТЕ РЕЛИЗА
    orderBy: [
      { releaseDate: 'desc' },
      { createdAt: 'desc' }
    ],
    take: 50, // Увеличим лимит, чтобы на фронте было из чего фильтровать
  });
  return this.mapTracks(tracks, userId);
  }

  async getArtistAlbums(artistId: number) {
    return this.prisma.album.findMany({
      where: { artistId },
      orderBy: { releaseDate: 'desc' },
      include: { artist: true } // Для обложек и инфо
    });
  }

  async adminGetAllTracks(query?: string, skip = 0) {
  return this.prisma.track.findMany({
    where: query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { artist: { name: { contains: query, mode: 'insensitive' } } }
      ]
    } : {},
    skip,
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { artist: true, album: true, featuredArtists: true }
  });
}

async deleteAllArtistsAdmin(): Promise<boolean> {
  // 1. Собираем URL всех файлов
  const [artists, albums, tracks] = await Promise.all([
    this.prisma.artist.findMany({ select: { avatar: true } }),
    this.prisma.album.findMany({ select: { coverUrl: true } }),
    this.prisma.track.findMany({ select: { url: true, coverUrl: true } }),
  ]);

  const allUrls = new Set<string>();
  artists.forEach(a => a.avatar && allUrls.add(a.avatar));
  albums.forEach(a => a.coverUrl && allUrls.add(a.coverUrl));
  tracks.forEach(t => {
    if (t.url) allUrls.add(t.url);
    if (t.coverUrl) allUrls.add(t.coverUrl);
  });

  const urlList = Array.from(allUrls);
  console.log(`[Admin] Starting mass deletion of ${urlList.length} files...`);

  // 2. Удаляем файлы чанками (по 20 штук), чтобы не забить канал
  const chunkSize = 20;
  for (let i = 0; i < urlList.length; i += chunkSize) {
    const chunk = urlList.slice(i, i + chunkSize);
    await Promise.all(chunk.map(url => this.cloudinaryService.deleteFileByUrl(url)));
    
    // Небольшая пауза между чанками для стабильности
    if (urlList.length > chunkSize) {
        await new Promise(res => setTimeout(res, 100));
    }
  }

  // 3. Очищаем БД. 
  // Удаляем в правильном порядке, чтобы не нарушить FK constraints
  await this.prisma.$transaction([
    this.prisma.listeningHistory.deleteMany(),
    this.prisma.playlistTrack.deleteMany(),
    this.prisma.trackLike.deleteMany(),
    this.prisma.track.deleteMany(),
    this.prisma.album.deleteMany(),
    this.prisma.artist.deleteMany(),
  ]);

  console.log(`[Admin] Mass deletion completed successfully.`);
  return true;
}

async adminGetAllAlbums(query?: string, skip = 0) {
  return this.prisma.album.findMany({
    where: query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { artist: { name: { contains: query, mode: 'insensitive' } } }
      ]
    } : {},
    skip,
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { artist: true }
  });
}

async adminGetAllArtists(query?: string, skip = 0) {
  return this.prisma.artist.findMany({
    where: query ? { name: { contains: query, mode: 'insensitive' } } : {},
    skip,
    take: 50,
    orderBy: { createdAt: 'desc' }
  });
}

  async deleteTrack(id: number) {
    await this.prisma.track.delete({ where: { id } });
    return true;
  }

  async deleteAlbum(id: number) {
    // 1. Находим все треки этого альбома
    const tracks = await this.prisma.track.findMany({ where: { albumId: id } });
    const trackIds = tracks.map(t => t.id);

    // 2. Удаляем всё в рамках одной транзакции
    await this.prisma.$transaction(async (tx) => {
      if (trackIds.length > 0) {
        // Удаляем лайки этих треков
        await tx.trackLike.deleteMany({ where: { trackId: { in: trackIds } } });
        // Удаляем эти треки из плейлистов пользователей
        await tx.playlistTrack.deleteMany({ where: { trackId: { in: trackIds } } });
        // Удаляем сами треки
        await tx.track.deleteMany({ where: { albumId: id } });
      }
      // Удаляем сам альбом
      await tx.album.delete({ where: { id } });
    });
    
    return true;
  }

   async deleteArtist(id: number) {
    // 1. Находим все треки этого артиста
    const tracks = await this.prisma.track.findMany({ where: { artistId: id } });
    const trackIds = tracks.map(t => t.id);

    // 2. Выполняем каскадное удаление
    await this.prisma.$transaction(async (tx) => {
      if (trackIds.length > 0) {
        // Удаляем лайки
        await tx.trackLike.deleteMany({ where: { trackId: { in: trackIds } } });
        // Удаляем треки из плейлистов
        await tx.playlistTrack.deleteMany({ where: { trackId: { in: trackIds } } });
        // Удаляем все треки артиста
        await tx.track.deleteMany({ where: { artistId: id } });
      }
      // Удаляем все альбомы артиста
      await tx.album.deleteMany({ where: { artistId: id } });
      // В конце удаляем самого артиста
      await tx.artist.delete({ where: { id } });
    });

    return true;
  }

   async updateTrack(input: any) { 
    const { id, featuredArtistIds, ...data } = input;
    return this.prisma.track.update({
      where: { id },
      data: {
         ...data,
         ...(featuredArtistIds && {
            featuredArtists: { set: featuredArtistIds.map(fid => ({ id: fid })) }
         })
      },
      include: { artist: true, album: true }
    });
  }
   async adminUpdateArtist(input: any) {
    const { id, ...data } = input;
    return this.prisma.artist.update({
      where: { id },
      data,
    });
  }

  async adminUpdateAlbum(input: any) {
    const { id, trackIds, ...data } = input;
    
    return this.prisma.album.update({
      where: { id },
      data: {
        ...data,
        // Если передали trackIds, обновляем связи треков с этим альбомом
        ...(trackIds !== undefined && {
          tracks: {
            set: trackIds.map(tId => ({ id: tId }))
          }
        })
      },
      include: { artist: true, tracks: true }
    });
  }
}