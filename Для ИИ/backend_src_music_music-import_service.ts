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
  private isImporting = false;
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

  private sendLog(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    this.eventsGateway.server.emit('admin_import_log', {
      message: `[${new Date().toLocaleTimeString()}] ${message}`,
      type,
    });
  }

  private getNextCloudinaryAccount() {
    const accounts = JSON.parse(process.env.CLOUDINARY_ACCOUNTS || '[]');
    return accounts[Math.floor(Math.random() * accounts.length)];
  }

  private async downloadAndUpload(url: string | undefined, type: 'avatars' | 'audio'): Promise<string | null> {
    if (!url) return null;
    const MAX_RETRIES = 3;
    let cleanUrl = url.replace('%%', type === 'audio' ? '' : '1000x1000');
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;

    if (!fs.existsSync(this.TEMP_DIR)) fs.mkdirSync(this.TEMP_DIR, { recursive: true });
    const tempFilePath = path.join(this.TEMP_DIR, `${crypto.randomUUID()}${type === 'audio' ? '.mp3' : '.jpg'}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios({ url: cleanUrl, method: 'GET', responseType: 'stream', timeout: 60000 });
        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);
        
        // Исправленная строка:
        await new Promise<void>((res, rej) => { 
          writer.on('finish', () => res()); 
          writer.on('error', (err) => rej(err)); 
        });

        const acc = this.getNextCloudinaryAccount();
        cloudinary.config({ cloud_name: acc.cloud_name, api_key: acc.api_key, api_secret: acc.api_secret, secure: true });

        const result = await cloudinary.uploader.upload(tempFilePath, {
          folder: type,
          resource_type: type === 'audio' ? 'video' : 'image',
        });
        
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        return result.secure_url;
      } catch (e) {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (attempt === MAX_RETRIES) return null;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    return null;
  }

  async importArtist(query: string) {
    if (this.isImporting) {
      this.sendLog('Предупреждение: Импорт уже запущен', 'warn');
      return;
    }
    this.isImporting = true;
    this.sendLog(`🔍 Начинаю поиск артиста: "${query}"`);

    try {
      const search = await this.client.search.search(query, 0, 'artist');
      const yArtist = search.result?.artists?.results?.[0];
      if (!yArtist) {
        this.sendLog('❌ Артист не найден', 'error');
        return;
      }

      // Артист
      let dbArtist = await this.prisma.artist.findFirst({
        where: { name: { equals: yArtist.name, mode: 'insensitive' } }
      });

      if (!dbArtist) {
        this.sendLog(`👤 Создание артиста: ${yArtist.name}`);
        const avatar = await this.downloadAndUpload(yArtist.cover?.uri, 'avatars');
        dbArtist = await this.prisma.artist.create({
          data: { name: yArtist.name, avatar, bio: "Yandex Import" }
        });
      }

      // Альбомы
      const albResp = await this.client.artists.getArtistsDirectAlbums(String(yArtist.id));
      for (const yAlbum of (albResp.result?.albums || [])) {
        const fullAlb = await this.client.albums.getAlbumsWithTracks(yAlbum.id);
        const yTracks = (fullAlb.result as any).volumes?.flat() || [];

        let dbAlbum = await this.prisma.album.findFirst({
          where: { title: yAlbum.title, artistId: dbArtist.id }
        });

        if (!dbAlbum) {
          this.sendLog(`💿 Загрузка альбома: ${yAlbum.title}`);
          const cover = await this.downloadAndUpload(yAlbum.coverUri, 'avatars');
          dbAlbum = await this.prisma.album.create({
            data: { title: yAlbum.title, artistId: dbArtist.id, year: yAlbum.year, coverUrl: cover }
          });
        }

        // Треки
        let trackCounter = 1;
        for (const yTrack of yTracks) {
          const exists = await this.prisma.track.findFirst({
            where: { title: yTrack.title, albumId: dbAlbum.id }
          });

          if (exists) {
            trackCounter++;
            continue;
          }

          this.sendLog(`  🎵 [${trackCounter}/${yTracks.length}] Скачивание: ${yTrack.title}`);
          
          // Получаем прямую ссылку
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
                artistId: dbArtist.id,
                albumId: dbAlbum.id,
                coverUrl: dbAlbum.coverUrl,
                trackNumber: trackCounter
              }
            });
          }
          trackCounter++;
        }
      }
      this.sendLog('✅ Импорт успешно завершен!', 'success');
    } catch (e) {
      this.sendLog(`❌ Ошибка импорта: ${e.message}`, 'error');
    } finally {
      this.isImporting = false;
    }
  }
}