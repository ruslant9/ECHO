import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Только изображения разрешены'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не был загружен');
    }
    return {
      url: `/uploads/avatars/${file.filename}`,
      filename: file.filename,
    };
  }

  @Post('audio')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, cb) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Разрешаем mp3, wav, ogg
        if (!file.mimetype.match(/\/(mpeg|mp3|wav|ogg)$/)) {
          return cb(new BadRequestException('Только аудио форматы (mp3, wav, ogg)'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 30 * 1024 * 1024 }, // лимит 30 МБ
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не был загружен');
    return { url: `/uploads/audio/${file.filename}` };
  }

  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/videos',
        filename: (req, file, cb) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(mp4|webm|quicktime)$/)) {
          return cb(new BadRequestException('Только видео форматы (mp4, webm, mov)'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB лимит
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не был загружен');
    return { url: `/uploads/videos/${file.filename}` };
  }

  @Post('message')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/messages',
        filename: (req, file, cb) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Только изображения разрешены'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadMessageImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не был загружен');
    }
    return {
      url: `/uploads/messages/${file.filename}`,
      filename: file.filename,
    };
  }
}
