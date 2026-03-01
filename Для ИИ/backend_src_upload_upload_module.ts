import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports:[AuthModule],
  controllers: [UploadController],
  providers: [CloudinaryService],
  exports:[CloudinaryService] // <--- ДОБАВИТЬ ЭТУ СТРОКУ
})
export class UploadModule {}