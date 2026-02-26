// backend/src/auth/jwt-auth-optional.guard.ts

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class JwtAuthGuardOptional extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  handleRequest(err, user, info) {
    // В стандартном Guard здесь выбрасывается ошибка, если user нет.
    // В Optional Guard мы просто возвращаем null, разрешая запрос.
    if (err || !user) {
      return null;
    }
    return user;
  }
}