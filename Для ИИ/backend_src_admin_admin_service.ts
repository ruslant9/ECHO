import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CloudinaryService } from '../upload/cloudinary.service'; // <--- ИМ

const execPromise = promisify(exec);

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService // <--- ИНЖЕКТИРОВАТЬ СЮДА
  ) {}

  async getStats() {
    const[
      totalUsers,
      onlineUsers,
      totalPosts,
      totalLikes,
      totalComments,
      totalMessages,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isOnline: true } }),
      this.prisma.post.count(),
      this.prisma.postLike.count(),
      this.prisma.comment.count(),
      this.prisma.message.count(),
    ]);

    // ПОЛУЧАЕМ СТАТИСТИКУ ХРАНИЛИЩ
    const storageStats = await this.cloudinaryService.getStorageStats();

    return {
      totalUsers,
      onlineUsers,
      totalPosts,
      totalLikes,
      totalComments,
      totalMessages,
      storageStats, // <--- ДОБАВИТЬ В ВОЗВРАТ
    };
  }

  // ВНИМАНИЕ: Эти методы требуют, чтобы ваше приложение было запущено через process manager (например, PM2).
  // `npm run start:prod` напрямую не будет работать с этим.
  // Пример для PM2, где 'backend' - имя вашего процесса.
  async controlServer(action: 'start' | 'stop' | 'restart'): Promise<boolean> {
    const processName = 'backend'; // Имя вашего приложения в PM2
    try {
      const { stdout } = await execPromise(`pm2 ${action} ${processName}`);
      console.log(`Server action '${action}' executed:`, stdout);
      return true;
    } catch (error) {
      console.error(`Error executing server action '${action}':`, error);
      throw new Error(`Не удалось выполнить команду сервера. Убедитесь, что PM2 установлен и настроен.`);
    }
  }
}