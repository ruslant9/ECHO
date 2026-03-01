import { Module, forwardRef } from '@nestjs/common'; // <--- ДОБАВЬТЕ forwardRef
import { EventsGateway } from './events.gateway';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    forwardRef(() => UsersModule), // <--- ОБЕРНИТЕ UsersModule в forwardRef
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}