// src/common/prisma-utils.ts
// Этот объект определяет поля пользователя, которые будут выбираться по умолчанию.
// Включает все необходимые поля для GraphQL User типа,
// включая password (для внутренних операций) и isAdmin.
export const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  password: true, // Включено для соответствия типу Prisma User, но не выводится в GraphQL-ответах
  isOnline: true,
  lastOnlineAt: true,
  isVerified: true,
  createdAt: true,
  bio: true,
  location: true,
  gender: true,
  website: true,
  avatar: true,
  banner: true,
  isAdmin: true, // Обязательно включаем isAdmin
};