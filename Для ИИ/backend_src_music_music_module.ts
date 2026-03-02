import { Module } from '@nestjs/common';
import { MusicResolver } from './music.resolver';
import { MusicService } from './music.service';
import { PrismaService } from '../prisma.service';
import { MusicImportService } from './music-import.service'; // Импортируем
import { EventsModule } from '../events/events.module'; // Нужно для EventsGateway
import { UploadModule } from '../upload/upload.module'; 

@Module({
  imports: [EventsModule, UploadModule], // один массив
  providers: [MusicResolver, MusicService, MusicImportService, PrismaService],
  exports: [MusicImportService], // Экспортируем, чтобы AdminModule его увидел
})
export class MusicModule {}