// backend/seed-videos.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// --- НАСТРОЙКИ ---
const INPUT_DIR = 'D:\\Echo\\input'; // Путь, откуда берем видео
const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'videos'); // Куда сохраняем (в бэкенд)

// Инициализация Prisma с адаптером (как в вашем проекте)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Вспомогательные данные для генерации фейковой активности
const DESCRIPTIONS = [
  "Зацените мой новый вайб! 🔥",
  "Как вам такое? 🤔",
  "Просто оставлю это здесь 😅",
  "Mood на сегодня 🎧",
  "Всем хороших выходных! ☀️",
  "Не судите строго 🙈",
  "Тренд из TikTok 💃",
  "Эстетика... ✨",
  "Когда скучно вечером 🌃",
  "Попытка номер 1 🎬"
];

const HASHTAGS_POOL = ["тренд", "вайб", "рекомендации", "топ", "echo", "настроение", "музыка", "лето", "природа", "смешно", "эстетика", "жиза"];

const COMMENTS_POOL = [
  "Круто! 🔥", "Агонь", "Жиза жизуная", "Лайк!", "Красота", "Дай трек?", 
  "Ахахаха, точно 😂", "Вау, как красиво", "Продолжай в том же духе", "Топ 1"
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

async function main() {

  // 1. Проверка директорий
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Ошибка: Папка с исходными видео не найдена (${INPUT_DIR})`);
    return;
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('📁 Создана папка uploads/videos');
  }

  // 2. Получение списка видеофайлов
  const allFiles = fs.readdirSync(INPUT_DIR);
  const videoFiles = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.webm', '.mov'].includes(ext);
  });

  if (videoFiles.length === 0) {
    console.log('⚠️ В папке input не найдено видео файлов (.mp4, .webm, .mov)');
    return;
  }

  console.log(`Найдено видео для импорта: ${videoFiles.length} шт.`);

  // 3. Получение пользователей из БД
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  
  if (users.length === 0) {
    console.error('❌ Ошибка: В базе данных нет пользователей. Сначала запустите seed-fake-activity.ts');
    return;
  }

  // 4. Обработка каждого видео
  for (let i = 0; i < videoFiles.length; i++) {
    const file = videoFiles[i];
    const inputPath = path.join(INPUT_DIR, file);
    
    // Генерация уникального имени как в контроллере NestJS
    const ext = path.extname(file);
    const uniqueFilename = `${crypto.randomUUID()}${ext}`;
    const outputPath = path.join(OUTPUT_DIR, uniqueFilename);
    const relativeUrl = `/uploads/videos/${uniqueFilename}`;

    // Копирование файла
    fs.copyFileSync(inputPath, outputPath);

    // Выбор случайного автора
    const author = randomItem(users);

    // Генерация метаданных
    const desc = randomItem(DESCRIPTIONS);
    const shuffledTags = HASHTAGS_POOL.sort(() => 0.5 - Math.random());
    const selectedTags = shuffledTags.slice(0, randomInt(1, 4));
    
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - randomInt(0, 14)); // Опубликовано от 0 до 14 дней назад
    createdAt.setHours(randomInt(8, 23), randomInt(0, 59));

    // 5. Создание записи Vibe в БД
    const vibe = await prisma.vibe.create({
      data: {
        videoUrl: relativeUrl,
        description: desc,
        hashtags: selectedTags,
        isPrivate: false,
        authorId: author.id,
        createdAt: createdAt,
        viewsCount: randomInt(50, 15000), // Фейковые просмотры
        repostsCount: randomInt(0, 15),
      }
    });

    // 6. Накрутка фейковых лайков и комментариев
    const likersCount = randomInt(2, Math.min(20, users.length - 1));
    const shuffledUsers = users.sort(() => 0.5 - Math.random());
    const likers = shuffledUsers.slice(0, likersCount);

    let commentsCount = 0;

    for (const liker of likers) {
      if (liker.id === author.id) continue; // Сам себе не ставит лайк в этом цикле

      // Добавляем лайк
      await prisma.vibeLike.create({
        data: { vibeId: vibe.id, userId: liker.id }
      });

      // С вероятностью 30% юзер оставляет комментарий
      if (Math.random() > 0.7) {
        const commentDate = new Date(createdAt.getTime() + randomInt(10000, 86400000)); // Коммент позже поста
        await prisma.vibeComment.create({
          data: {
            vibeId: vibe.id,
            authorId: liker.id,
            content: randomItem(COMMENTS_POOL),
            createdAt: commentDate
          }
        });
        commentsCount++;
      }
    }

    // Обновляем счетчики у вайба
    await prisma.vibe.update({
      where: { id: vibe.id },
      data: { 
        likesCount: likers.length, 
        commentsCount: commentsCount 
      }
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });