import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config'; // Убедимся, что .env переменные загружены

// 1. Импортируем адаптер Prisma для PostgreSQL
import { PrismaPg } from '@prisma/adapter-pg'; 
// 2. Импортируем сам драйвер 'pg'
import { Pool } from 'pg'; 

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  constructor() {
    // 3. Убедимся, что DATABASE_URL существует
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set in the environment variables.");
    }

    // 4. Создаем экземпляр пула соединений PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // 5. Создаем адаптер Prisma для PostgreSQL, используя наш пул
    const adapter = new PrismaPg(pool);

    // 6. Передаем адаптер в конструктор PrismaClient
    super({
      adapter, // <--- Теперь это корректный объект адаптера
      // Опционально: можно добавить опции логирования, если нужно
      // log: ['info', 'warn', 'error'], 
    });
  }

  async onModuleInit() {
    // При использовании адаптера, $connect() обычно не нужен
    // или его поведение может быть иным. 
    // Если возникнут проблемы, можно попробовать раскомментировать.
    // await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}