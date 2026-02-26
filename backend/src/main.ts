import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { PrismaService } from './prisma.service';
import { join } from 'path';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prismaService = app.get(PrismaService);
  await prismaService.user.updateMany({
    data: {
      isOnline: false,
    },
  });
  console.log('🔄 All users set to offline status on startup');

  const avatarsDir = join(process.cwd(), 'uploads', 'avatars');
  if (!existsSync(avatarsDir)) {
    mkdirSync(avatarsDir, { recursive: true });
    console.log('📁 Created avatars uploads directory');
  }
  const messagesDir = join(process.cwd(), 'uploads', 'messages');
  if (!existsSync(messagesDir)) {
    mkdirSync(messagesDir, { recursive: true });
    console.log('📁 Created messages uploads directory');
  }

  // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }, // <--- РАЗРЕШАЕМ ЗАГРУЗКУ ФАЙЛОВ
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          imgSrc: ["'self'", "data:", "blob:", "http:", "https:"], // Разрешаем картинки с любых http источников
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  // --------------------------

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT ?? 3400;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`🎮 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();