import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  Req,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { CloudinaryService } from './cloudinary.service';
import { Response, Request } from 'express';
import { createReadStream, statSync, existsSync } from 'fs';

// Временное хранилище перед отправкой в Cloudinary или для локального использования
const tempStorage = diskStorage({
  destination: './uploads/temp',
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  // --- ЭНДПОИНТ ДЛЯ ПОТОКОВОГО ВОСПРОИЗВЕДЕНИЯ ---
  @Get('stream/:filename')
  async streamAudio(@Param('filename') filename: string, @Req() req: Request, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', 'audio', filename);
    
    if (!existsSync(filePath)) {
      return res.status(HttpStatus.NOT_FOUND).send('Файл не найден');
    }

    const stats = statSync(filePath);
    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      // Обработка Range-запроса (браузер просит кусок файла)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const file = createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };

      res.writeHead(HttpStatus.PARTIAL_CONTENT, head);
      file.pipe(res);
    } else {
      // Обычный запрос (отдача всего файла)
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(HttpStatus.OK, head);
      createReadStream(filePath).pipe(res);
    }
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: tempStorage }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не был загружен');
    const url = await this.cloudinaryService.uploadImage(file.path, 'avatars');
    return { url, filename: file.filename };
  }

  @Post('message')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: tempStorage }))
  async uploadMessageImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не был загружен');
    const url = await this.cloudinaryService.uploadImage(file.path, 'messages');
    return { url, filename: file.filename };
  }

  @Post('audio')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio', // Сохраняем локально для стриминга
        filename: (req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не был загружен');
    // Возвращаем путь к нашему новому контроллеру стриминга
    return { url: `/upload/stream/${file.filename}` };
  }

  @Post('video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: tempStorage }))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не был загружен');
    const url = await this.cloudinaryService.uploadMedia(file.path, 'videos', 'video');
    return { url };
  }
}