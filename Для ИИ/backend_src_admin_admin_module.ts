import { Module } from '@nestjs/common';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { UploadModule } from '../upload/upload.module'; // <--- ИМПОРТ

@Module({
  imports: [UploadModule], // <--- ДОБАВИТЬ СЮДА
  providers: [AdminResolver, AdminService, PrismaService],
})
export class AdminModule {}