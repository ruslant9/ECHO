// backend_src_auth_jwt-auth_guard.ts

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  // 1. Переопределяем getRequest, чтобы Passport мог достать req из GraphQL или REST контекста
  getRequest(context: ExecutionContext) {
    // Проверяем, является ли это GraphQL запросом
    try {
      const gqlContext = GqlExecutionContext.create(context);
      const gqlReq = gqlContext.getContext()?.req;
      if (gqlReq) {
        return gqlReq;
      }
    } catch {
      // Если не GraphQL контекст, продолжаем к REST
    }
    
    // Если не GraphQL, значит это REST запрос
    return context.switchToHttp().getRequest();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 2. Вызываем стандартную проверку JWT.
    // Это запустит JwtStrategy.validate(), и если токен валиден,
    // Passport автоматически прикрепит объект пользователя к req.user
    const canActivate = await super.canActivate(context);

    if (!canActivate) {
      return false;
    }

    // 3. Получаем доступ к req, чтобы проверить сессию
    let req: any;
    try {
      const gqlContext = GqlExecutionContext.create(context);
      const gqlReq = gqlContext.getContext()?.req;
      if (gqlReq) {
        req = gqlReq;
      } else {
        req = context.switchToHttp().getRequest();
      }
    } catch {
      // Если не GraphQL контекст, используем HTTP контекст
      req = context.switchToHttp().getRequest();
    }

    // На всякий случай проверяем, что пользователь действительно установлен
    if (!req.user || !req.user.userId) {
        throw new UnauthorizedException('Ошибка авторизации: пользователь не определен.');
    }

    // 4. Проверяем наличие токена в базе сессий (ваша логика логаута/банна)
    const token = this.extractToken(req);
    
    if (!token) {
        throw new UnauthorizedException('Токен не найден.');
    }

    // Проверяем, что prisma инициализирован
    if (!this.prisma) {
      throw new UnauthorizedException('Ошибка инициализации базы данных.');
    }

    const session = await this.prisma.session.findUnique({
      where: { token: token },
    });

    if (!session) {
      throw new UnauthorizedException('Сессия недействительна или была завершена.');
    }

    return true;
  }

  private extractToken(req: any): string | null {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    }
    return null;
  }
}