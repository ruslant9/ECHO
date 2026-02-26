import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from '../prisma.service';
// Импортируем userSelect из общего файла
import { userSelect } from '../common/prisma-utils'; 

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Доступ запрещен: требуется аутентификация.');
    }

    // Для AdminGuard нам нужны только ID и isAdmin.
    // Если PrismaClient все еще ругается на "isAdmin" как неизвестное свойство
    // после prisma generate и перезапуска TS-сервера, это очень необычно.
    // Мы можем явно выбрать только то, что нужно.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        isAdmin: true // Явно выбираем isAdmin
      }, 
    });

    if (!user || !user.isAdmin) {
      throw new ForbiddenException('Доступ запрещен: требуются права администратора.');
    }

    return true;
  }
}
