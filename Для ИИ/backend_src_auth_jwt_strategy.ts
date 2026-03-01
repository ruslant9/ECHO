// backend_src_auth_jwt_strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common'; // Импортируйте UnauthorizedException

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET, // Убедитесь, что это совпадает с вашим AuthService
    });
  }

  async validate(payload: any) {
    // Явно проверяем, что payload.sub определен и является числом
    if (typeof payload.sub !== 'number' || isNaN(payload.sub)) {
      throw new UnauthorizedException('Неверный токен: отсутствует идентификатор пользователя (sub).');
    }
    return { userId: payload.sub, username: payload.username };
  }
}