import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs/promises';
import * as sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';

interface CloudinaryAccount {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  isFull: boolean;
  lastChecked: number;
  cachedUsage?: number; // <-- Добавить
  cachedLimit?: number; // <-- Добавить
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private accounts: CloudinaryAccount[] =[];
  private currentIndex = 0;

  constructor() {
    // Парсим аккаунты из .env
    try {
      const parsed = JSON.parse(process.env.CLOUDINARY_ACCOUNTS || '[]');
      this.accounts = parsed.map(acc => ({
        ...acc,
        isFull: false,
        lastChecked: 0,
      }));
      this.logger.log(`Initialized ${this.accounts.length} Cloudinary accounts`);
    } catch (e) {
      this.logger.error('Failed to parse CLOUDINARY_ACCOUNTS from .env');
    }
  }

 async getStorageStats() {
    const stats = [];
    const now = Date.now();
    // 25 GB в байтах
    const DEFAULT_LIMIT = 25 * 1024 * 1024 * 1024; 

    for (let i = 0; i < this.accounts.length; i++) {
      const account = this.accounts[i];

      // Проверяем, если прошло 5 минут ИЛИ если лимит равен 1 (старый баг)
      if (now - account.lastChecked > 5 * 60 * 1000 || !account.cachedLimit || account.cachedLimit === 1) {
        try {
          cloudinary.config({
            cloud_name: account.cloud_name,
            api_key: account.api_key,
            api_secret: account.api_secret,
            secure: true
          });

          const usage = await cloudinary.api.usage();

          account.cachedUsage = usage.storage.usage || 0;
          // Если API вернул 0 (бесплатный тариф), берем наши 25 ГБ
          account.cachedLimit = usage.storage.limit || DEFAULT_LIMIT;

          // На всякий случай, если API вернул 0, форсируем 25 ГБ
          if (account.cachedLimit === 0) account.cachedLimit = DEFAULT_LIMIT;

          const usageRatio = account.cachedUsage / account.cachedLimit;
          account.isFull = usageRatio > 0.9;
          account.lastChecked = now;
        } catch (error) {
          this.logger.warn(`Failed to check usage for ${account.cloud_name}`);
          // При ошибке (например, неверный ключ) показываем 0 занято, но лимит 25 ГБ
          if (account.cachedUsage === undefined) {
             account.cachedUsage = 0;
             account.cachedLimit = DEFAULT_LIMIT;
          }
        }
      }

      // Формируем ответ для фронта
      const usage = account.cachedUsage || 0;
      const limit = account.cachedLimit || DEFAULT_LIMIT;
      const percentage = (usage / limit) * 100;

      stats.push({
        cloudName: account.cloud_name,
        usage,
        limit,
        percentage,
        isFull: account.isFull || false
      });
    }
    return stats;
  }

  // Алгоритм Round-Robin с проверкой лимитов (умная балансировка)
  private async getAvailableAccount(): Promise<CloudinaryAccount> {
    for (let i = 0; i < this.accounts.length; i++) {
      this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
      const account = this.accounts[this.currentIndex];

      // Проверяем лимиты раз в 30 минут, чтобы не спамить API
      const now = Date.now();
      if (now - account.lastChecked > 30 * 60 * 1000) {
        try {
          // Вызов Admin API для проверки заполненности диска
          const usage = await cloudinary.api.usage({
            cloud_name: account.cloud_name,
            api_key: account.api_key,
            api_secret: account.api_secret,
          });
          
          // Если использовано больше 90% (у Cloudinary лимит 25 кредитов = ~25GB)
          const usageRatio = usage.storage.usage / usage.storage.limit;
          account.isFull = usageRatio > 0.9;
          account.lastChecked = now;
          this.logger.debug(`Account ${account.cloud_name} usage: ${(usageRatio * 100).toFixed(2)}%`);
        } catch (error) {
          this.logger.warn(`Failed to check usage for ${account.cloud_name}`);
        }
      }

      if (!account.isFull) {
        return account;
      }
    }

    throw new InternalServerErrorException('Все хранилища Cloudinary переполнены!');
  }

  async uploadImage(filePath: string, folder: string): Promise<string> {
    const account = await this.getAvailableAccount();
    const tempOptPath = `${filePath}_optimized.webp`;

    try {
      // 1. Умное сжатие фото локально через Sharp (без потери качества)
      await sharp(filePath)
        .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true }) // Ограничиваем макс размер
        .webp({ quality: 80 }) // Конвертируем в webp для максимального сжатия
        .toFile(tempOptPath);

      // 2. Загружаем оптимизированный файл на нужный аккаунт
      const result = await cloudinary.uploader.upload(tempOptPath, {
        folder,
        cloud_name: account.cloud_name,
        api_key: account.api_key,
        api_secret: account.api_secret,
      });

      return result.secure_url;
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Ошибка при загрузке изображения');
    } finally {
      // 3. Удаляем временные файлы
      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(tempOptPath).catch(() => {});
    }
  }

  async uploadMedia(filePath: string, folder: string, resourceType: 'video' | 'raw' | 'auto'): Promise<string> {
    const account = await this.getAvailableAccount();
    
    try {
      // Для видео и аудио мы делегируем сжатие самому Cloudinary,
      // чтобы не вешать процессор нашего сервера.
      // Transformation quality: "auto" сожмет медиа без сильной потери качества.
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
        cloud_name: account.cloud_name,
        api_key: account.api_key,
        api_secret: account.api_secret,
        // Эта трансформация применится ДО сохранения, то есть тяжелый оригинал будет удален
        transformation:[
          { quality: 'auto:good' } 
        ]
      });

      return result.secure_url;
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Ошибка при загрузке медиафайла');
    } finally {
      // Удаляем локальный файл после загрузки
      await fs.unlink(filePath).catch(() => {});
    }
  }
}