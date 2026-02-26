import { PrismaClient, MessageType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config'; // <-- 1. Загрузка переменных окружения
import { PrismaPg } from '@prisma/adapter-pg'; // <-- 2. Импорт адаптера
import { Pool } from 'pg'; // <-- 3. Импорт пула соединений

// --- 4. Правильная инициализация Prisma Client с адаптером ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
// ------------------------------------------------------------------

// Конфигурация
const TARGET_USERNAME = 'ruslant9'; // Целевой юзер
const BOT_COUNT = 10; // Количество ботов
const PASSWORD_PLAIN = '123456'; // Пароль для ботов

// Вспомогательные данные
const NAMES = ['Алина', 'Дмитрий', 'Елена', 'Максим', 'Ольга', 'Артем', 'София', 'Кирилл', 'Виктория', 'Иван', 'Мария', 'Сергей'];
const LAST_NAMES = ['Иванов(а)', 'Смирнов(а)', 'Кузнецов(а)', 'Попов(а)', 'Соколов(а)', 'Михайлов(а)', 'Новиков(а)'];
const PHRASES = [
  'Привет, как дела?', 'Отличная погода сегодня!', 'Видел твой новый пост, круто!', 
  'Когда пойдем гулять?', 'Скинь фотки с выходных.', 'Очень интересно...', 
  'Да, полностью согласен.', 'Ха-ха, смешно!', 'Доброе утро!', 'Спокойной ночи.'
];
const POST_CONTENTS = [
  'Мой завтрак сегодня был великолепен ☕️',
  'Гуляю по парку, осень прекрасна 🍂',
  'Наконец-то пятница! Какие планы?',
  'Прочитал интересную книгу, всем советую.',
  'Работа кипит, но настроение отличное.',
  'Немного ностальгии по лету ☀️',
  'Котики правят миром 🐈',
  'Учусь программировать, это сложно но интересно.'
];

// Генератор случайного числа
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Генератор случайного элемента массива
const randomItem = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

// Генератор даты в прошлом (от 0 до daysAgo дней)
const randomDatePast = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  date.setHours(randomInt(8, 23), randomInt(0, 59), 0);
  return date;
};

async function main() {
  console.log('🚀 Start seeding fake activity...');

  const hashedPassword = await bcrypt.hash(PASSWORD_PLAIN, 10);

  let targetUser = await prisma.user.findUnique({ where: { username: TARGET_USERNAME } });
  
  if (!targetUser) {
    console.log(`User ${TARGET_USERNAME} not found, creating...`);
    targetUser = await prisma.user.create({
      data: {
        email: `${TARGET_USERNAME}@example.com`,
        username: TARGET_USERNAME,
        name: 'Руслан Т.',
        password: hashedPassword,
        isVerified: true,
        isOnline: true,
      }
    });
  }
  console.log(`Target user ID: ${targetUser.id}`);

  const bots = [];
  for (let i = 0; i < BOT_COUNT; i++) {
    const name = randomItem(NAMES);
    const lastName = randomItem(LAST_NAMES);
    const username = `bot_${i}_${Date.now()}`;
    const gender = ['Алина', 'Елена', 'Ольга', 'София', 'Виктория', 'Мария'].includes(name) ? 'female' : 'male';
    const avatar = gender === 'female' 
      ? `https://randomuser.me/api/portraits/women/${randomInt(1, 90)}.jpg`
      : `https://randomuser.me/api/portraits/men/${randomInt(1, 90)}.jpg`;

    const user = await prisma.user.create({
      data: {
        email: `${username}@fake.com`,
        username: username,
        name: `${name} ${lastName}`,
        password: hashedPassword,
        isVerified: true,
        avatar: avatar,
        bio: 'Я просто бот, но с душой.',
        location: 'Москва',
        gender: gender,
        createdAt: randomDatePast(30),
        lastOnlineAt: new Date(),
      }
    });
    bots.push(user);
    console.log(`Created bot: ${user.username}`);
  }

  console.log('Creating posts and interactions...');
  
  const allPosts = [];

  for (const bot of bots) {
    const postsCount = randomInt(1, 3);
    for (let j = 0; j < postsCount; j++) {
      const createdAt = randomDatePast(10);
      const post = await prisma.post.create({
        data: {
          authorId: bot.id,
          content: randomItem(POST_CONTENTS),
          isPublished: true,
          createdAt: createdAt,
          updatedAt: createdAt,
          likesCount: 0,
          commentsCount: 0,
          images: [], // Добавлено, так как поле обязательно
        }
      });
      allPosts.push(post);
    }
  }

  for (const post of allPosts) {
    const likers = bots.sort(() => 0.5 - Math.random()).slice(0, randomInt(3, 8));
    
    for (const liker of likers) {
      await prisma.postLike.create({
        data: { postId: post.id, userId: liker.id }
      });
      
      if (Math.random() > 0.7) {
        await prisma.comment.create({
          data: {
            content: randomItem(PHRASES),
            postId: post.id,
            authorId: liker.id,
            createdAt: randomDatePast(2)
          }
        });
        await prisma.post.update({ where: { id: post.id }, data: { commentsCount: { increment: 1 } } });
      }
    }
    
    await prisma.post.update({
      where: { id: post.id },
      data: { likesCount: likers.length }
    });
  }

  console.log('Creating conversations...');

  const chatPartners = bots.slice(0, 5); 

  for (let i = 0; i < chatPartners.length; i++) {
    const partner = chatPartners[i];
    
    const conversation = await prisma.conversation.create({
      data: { isGroup: false }
    });

    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId: targetUser.id },
        { conversationId: conversation.id, userId: partner.id }
      ]
    });

    const messagesCount = randomInt(5, 15);
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - i * 2);

    let lastMessageDate = baseDate;

    for (let m = 0; m < messagesCount; m++) {
        const msgDate = new Date(lastMessageDate);
        msgDate.setMinutes(msgDate.getMinutes() + randomInt(10, 300));
        
        const senderId = Math.random() > 0.5 ? targetUser.id : partner.id;
        
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: senderId,
                content: randomItem(PHRASES),
                createdAt: msgDate,
                updatedAt: msgDate,
                type: MessageType.REGULAR
            }
        });
        lastMessageDate = msgDate;
    }

    await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: lastMessageDate }
    });
    
    console.log(`Created conversation between ${TARGET_USERNAME} and ${partner.username} with ${messagesCount} messages.`);
  }

  console.log('✅ Fake activity generation complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });