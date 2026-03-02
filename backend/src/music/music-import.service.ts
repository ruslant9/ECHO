import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { YandexMusicClient } from 'yandex-music-client';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class MusicImportService {
  private client: YandexMusicClient;
  private queue: string[] = [];
  private isProcessing = false;
  private currentArtist: string | null = null;
  private TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {
    this.client = new YandexMusicClient({
      BASE: 'https://api.music.yandex.net',
      HEADERS: {
        Authorization: `OAuth ${process.env.YANDEX_TOKEN}`,
        'Accept-Language': 'ru',
      },
    });
  }

  private broadcastStatus(message?: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    if (message) {
      this.eventsGateway.server.emit('admin_import_log', {
        message: `[${new Date().toLocaleTimeString()}] ${this.currentArtist ? `[${this.currentArtist}] ` : ''}${message}`,
        type,
      });
    }
    this.eventsGateway.server.emit('admin_import_queue_update', {
      queue: this.queue,
      isProcessing: this.isProcessing,
      currentArtist: this.currentArtist
    });
  }

  private async getOrCreateArtist(yArtist: any) {
    let dbArtist = await this.prisma.artist.findFirst({
      where: { name: { equals: yArtist.name, mode: 'insensitive' } }
    });

    if (!dbArtist) {
      this.broadcastStatus(`👤 Создание артиста: ${yArtist.name}`);
      const avatar = await this.downloadAndUpload(yArtist.cover?.uri, 'avatars');
      dbArtist = await this.prisma.artist.create({
        data: { name: yArtist.name, avatar, bio: "Yandex Import" }
      });
    }
    return dbArtist;
  }

  async addToQueue(queries: string[]) {
    const newItems = queries.map(q => q.trim()).filter(q => q && !this.queue.includes(q) && q !== this.currentArtist);
    this.queue.push(...newItems);
    this.broadcastStatus(`Добавлено в очередь: ${newItems.join(', ')}`, 'info');

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      this.currentArtist = null;
      this.broadcastStatus('🏁 Очередь пуста. Все задачи выполнены.', 'success');
      return;
    }
    this.isProcessing = true;
    this.currentArtist = this.queue.shift();
    try {
      await this.importArtistLogic(this.currentArtist);
    } catch (e) {
      this.broadcastStatus(`❌ Ошибка импорта ${this.currentArtist}: ${e.message}`, 'error');
    }
    this.processQueue();
  }

  private async importArtistLogic(query: string) {
    try {
      const search = await this.client.search.search(query, 0, 'artist');
      const yArtist = search.result?.artists?.results?.[0];
      if (!yArtist) {
        this.broadcastStatus(`Артист "${query}" не найден`, 'error');
        return;
      }

      // Главный артист, которого мы импортируем сейчас
      const mainDbArtist = await this.getOrCreateArtist(yArtist);

      const albResp = await this.client.artists.getArtistsDirectAlbums(String(yArtist.id));
      const albums = albResp.result?.albums || [];
      
      for (const [aIdx, yAlbum] of albums.entries()) {
        this.broadcastStatus(`💿 [${aIdx + 1}/${albums.length}] Альбом: ${yAlbum.title}`);
        
        const fullAlb = await this.client.albums.getAlbumsWithTracks(yAlbum.id);
        const yTracks = (fullAlb.result as any).volumes?.flat() || [];

        let dbAlbum = await this.prisma.album.findFirst({
          where: { title: yAlbum.title, artistId: mainDbArtist.id }
        });

        if (!dbAlbum) {
          const cover = await this.downloadAndUpload(yAlbum.coverUri, 'avatars');
          dbAlbum = await this.prisma.album.create({
            data: { 
              title: yAlbum.title, 
              artistId: mainDbArtist.id, 
              year: yAlbum.year, 
              coverUrl: cover 
            }
          });
        }

        for (const [tIdx, yTrack] of yTracks.entries()) {
          const trackArtists = yTrack.artists || [];
          const dbTrackArtists = [];

          // Подгружаем всех артистов трека
          for (const yArt of trackArtists) {
            dbTrackArtists.push(await this.getOrCreateArtist(yArt));
          }

          // === ЛОГИКА РАСПРЕДЕЛЕНИЯ РОЛЕЙ ===
          // Ищем, есть ли наш "главный" артист в списке авторов этого трека
          const currentTargetInTrack = dbTrackArtists.find(a => a.id === mainDbArtist.id);
          
          let mainTrackArtist;
          let featuredArtists;

          if (currentTargetInTrack) {
            // Если наш артист есть в треке (даже если он не первый у Яндекса)
            // Мы ставим его как владельца трека
            mainTrackArtist = currentTargetInTrack;
            // Все остальные артисты трека (кроме него) идут в фиты
            featuredArtists = dbTrackArtists.filter(a => a.id !== mainDbArtist.id);
          } else {
            // Если вдруг нашего артиста нет в списке (редкий случай для Яндекса)
            mainTrackArtist = dbTrackArtists[0];
            featuredArtists = dbTrackArtists.slice(1);
          }
          // =================================

          // Обновляем шапку альбома (добавляем туда всех участников как "featured")
          if (featuredArtists.length > 0) {
            await this.prisma.album.update({
              where: { id: dbAlbum.id },
              data: {
                featuredArtists: {
                  connect: featuredArtists.map(a => ({ id: a.id }))
                }
              }
            });
          }

          const exists = await this.prisma.track.findFirst({
            where: { title: yTrack.title, albumId: dbAlbum.id },
            include: { featuredArtists: true }
          });

          if (exists) {
            // Если трек есть, но фитов стало больше (например, догрузка), обновляем связи
            if (exists.featuredArtists.length < featuredArtists.length) {
              await this.prisma.track.update({
                where: { id: exists.id },
                data: {
                  featuredArtists: {
                    set: featuredArtists.map(a => ({ id: a.id }))
                  }
                }
              });
            }
            continue;
          }

          this.broadcastStatus(`  🎵 [${tIdx + 1}/${yTracks.length}] ${yTrack.title}`);
          
          try {
            const info = await this.client.tracks.getDownloadInfo(String(yTrack.id));
            const best = info.result.reduce((p, c) => (c.bitrateInKbps > p.bitrateInKbps ? c : p));
            const xml = await axios.get(best.downloadInfoUrl);
            const host = xml.data.match(/<host>(.*?)<\/host>/)?.[1];
            const pathVal = xml.data.match(/<path>(.*?)<\/path>/)?.[1];
            const ts = xml.data.match(/<ts>(.*?)<\/ts>/)?.[1];
            const s = xml.data.match(/<s>(.*?)<\/s>/)?.[1];
            const sign = crypto.createHash('md5').update('XGRlBW9FXlekgbPrRHuSiA' + pathVal.substring(1) + s).digest('hex');
            const directUrl = `https://${host}/get-mp3/${sign}/${ts}${pathVal}`;

            const audioUrl = await this.downloadAndUpload(directUrl, 'audio');
            if (audioUrl) {
              await this.prisma.track.create({
                data: {
                  title: yTrack.title,
                  url: audioUrl,
                  duration: Math.floor(yTrack.durationMs / 1000),
                  artistId: mainTrackArtist.id, 
                  albumId: dbAlbum.id,
                  coverUrl: dbAlbum.coverUrl,
                  trackNumber: tIdx + 1,
                  featuredArtists: {
                    connect: featuredArtists.map(a => ({ id: a.id }))
                  }
                }
              });
            }
          } catch (trackErr) {
            this.broadcastStatus(`  ⚠️ Ошибка скачивания трека: ${yTrack.title}`, 'warn');
          }
        }
      }
      this.broadcastStatus(`✅ Артист "${yArtist.name}" готов!`, 'success');
    } catch (e) {
      throw e;
    }
  }

  private async downloadAndUpload(url: string | undefined, type: 'avatars' | 'audio'): Promise<string | null> {
    if (!url) return null;
    let cleanUrl = url.replace('%%', type === 'audio' ? '' : '1000x1000');
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;

    if (!fs.existsSync(this.TEMP_DIR)) fs.mkdirSync(this.TEMP_DIR, { recursive: true });
    const tempFilePath = path.join(this.TEMP_DIR, `${crypto.randomUUID()}${type === 'audio' ? '.mp3' : '.jpg'}`);

    try {
      const response = await axios({ url: cleanUrl, method: 'GET', responseType: 'stream', timeout: 60000 });
      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', (err) => reject(err));
      });

      const accounts = JSON.parse(process.env.CLOUDINARY_ACCOUNTS || '[]');
      const acc = accounts[Math.floor(Math.random() * accounts.length)];
      cloudinary.config({ cloud_name: acc.cloud_name, api_key: acc.api_key, api_secret: acc.api_secret, secure: true });

      const result = await cloudinary.uploader.upload(tempFilePath, {
        folder: type,
        resource_type: type === 'audio' ? 'video' : 'image',
      });
      fs.unlinkSync(tempFilePath);
      return result.secure_url;
    } catch (e) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return null;
    }
  }

  getQueueStatus() {
    return { queue: this.queue, isProcessing: this.isProcessing, currentArtist: this.currentArtist };
  }

  clearQueue() {
    this.queue = [];
    this.broadcastStatus('🗑 Очередь очищена', 'warn');
  }
}