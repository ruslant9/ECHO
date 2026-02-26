import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePlaylistInput, UpdatePlaylistInput } from './dto/create-playlist.input';
import { CreateArtistInput, CreateAlbumInput, CreateTrackInput } from './dto/admin-music.input';

@Injectable()
export class MusicService {
  constructor(private prisma: PrismaService) {}

  // === ПОЛЬЗОВАТЕЛЬСКИЕ МЕТОДЫ ===

  async getRecommendations(userId: number) {
    const tracks = await this.prisma.track.findMany({
      take: 20,
      include: { artist: true },
      orderBy: { id: 'desc' }
    });
    return this.mapTracks(tracks, userId);
  }

  async search(query: string, userId: number) {
    if (!query) return [];
    const tracks = await this.prisma.track.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { name: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: { artist: true }
    });
    return this.mapTracks(tracks, userId);
  }

  async getMyLibrary(userId: number) {
    const likes = await this.prisma.trackLike.findMany({
      where: { userId },
      include: { track: { include: { artist: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return this.mapTracks(likes.map(l => l.track), userId);
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
    return this.prisma.playlist.create({
      data: {
        ownerId: userId,
        title: input.title,
        coverUrl: input.coverUrl,
        isPrivate: input.isPrivate || false,
      }
    });
  }

  async getMyPlaylists(userId: number) {
    return this.prisma.playlist.findMany({
      where: { ownerId: userId },
      include: { 
        tracks: { include: { track: { include: { artist: true } } } } 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

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

     return this.prisma.playlist.update({
         where: { id: input.id },
         data: {
             title: input.title,
             coverUrl: input.coverUrl
         }
     });
  }

  async addTrackToPlaylist(userId: number, playlistId: number, trackId: number) {
      const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist || playlist.ownerId !== userId) throw new Error('Нет прав');

      const exists = await this.prisma.playlistTrack.findUnique({
          where: { playlistId_trackId: { playlistId, trackId } }
      });
      if (exists) return false;

      await this.prisma.playlistTrack.create({
          data: { playlistId, trackId }
      });
      return true;
  }

  async removeTrackFromPlaylist(userId: number, playlistId: number, trackId: number) {
      const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist || playlist.ownerId !== userId) throw new Error('Нет прав');

      await this.prisma.playlistTrack.delete({
          where: { playlistId_trackId: { playlistId, trackId } }
      });
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
}