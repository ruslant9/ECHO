import { Module } from '@nestjs/common';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { UploadModule } from '../upload/upload.module';
import { MusicModule } from '../music/music.module'; // Импортируем MusicModule

@Module({
  imports: [
    UploadModule, 
    MusicModule // Добавляем сюда, это даст доступ к MusicImportService
  ], 
  providers: [AdminResolver, AdminService, PrismaService],
})
export class AdminModule {}