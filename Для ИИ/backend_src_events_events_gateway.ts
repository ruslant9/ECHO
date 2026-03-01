import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket, 
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common'; // <--- ДОБАВЛЕНО
import { Server, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    @Inject(forwardRef(() => UsersService)) // Оборачиваем UsersService
    private usersService: UsersService,
    // -----------------------
    private jwtService: JwtService
  ) {}

  sendNewSessionNotification(userId: number, newSession: any, currentToken: string) {
    const roomSockets = this.server.in(`user_${userId}`);
    
    roomSockets.fetchSockets().then(sockets => {
      sockets.forEach(socket => {
        const socketToken = socket.handshake.auth.token || socket.handshake.headers.authorization;
        if (socketToken !== currentToken) {
          socket.emit('new_session_detected', newSession);
        }
      });
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      if (!token) {
        console.log('No token provided, disconnecting socket');
        client.disconnect();
        return;
      }
      
      // Проверяем JWT, используя тот же секрет, что и в JwtModule.
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      
      await this.usersService.setOnlineStatus(userId, true);
      
      client.data.userId = userId;
      client.data.username = payload.username;
      
      client.join(`user_${userId}`);
      
      console.log(`User connected: ${payload.username} (ID: ${userId}) joined room user_${userId}`);

      this.server.emit('user_status_change', {
        userId: userId,
        isOnline: true,
      });
    } catch (e: any) {
      console.error('Socket connection error:', e.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      await this.usersService.setOnlineStatus(client.data.userId, false);
      
      console.log(`User disconnected: ${client.data.username} (ID: ${client.data.userId})`);
      
      this.server.emit('user_status_change', {
        userId: client.data.userId,
        isOnline: false,
      });
    }
  }

  sendNotificationToUser(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('new_notification', notification);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.conversationId) return;

    const prisma = (this.usersService as any).prisma;
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: data.conversationId,
        userId: { not: userId },
        isKicked: false, // не отправляем индикатор печати вышедшим из беседы
      },
    });

    const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
    const userName = u?.name || u?.username || 'Кто-то';

    for (const participant of otherParticipants) {
      this.server.to(`user_${participant.userId}`).emit('user_typing', {
        userId,
        conversationId: data.conversationId,
        userName: userName,
      });
    }
  }

  @SubscribeMessage('join_post_room')
  handleJoinPostRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { postId: number }) {
    if (!client || typeof client.join !== 'function') {
      console.error('Error: client is not a valid socket object or join method is missing.');
      return;
    }

    client.join(`post_room_${data.postId}`);
    console.log(`Client ${client.id} joined post room: post_room_${data.postId}`);
  }

  @SubscribeMessage('join_profile_room')
  handleJoinProfileRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: number }) {
    client.join(`profile_room_${data.userId}`);
    console.log(`Client ${client.id} joined profile room: profile_room_${data.userId}`);
  }

  @SubscribeMessage('leave_profile_room')
  handleLeaveProfileRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: number }) {
    client.leave(`profile_room_${data.userId}`);
  }

  @SubscribeMessage('leave_post_room')
  handleLeavePostRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { postId: number }) {
    if (!client || typeof client.leave !== 'function') {
      console.error('Error: client is not a valid socket object or leave method is missing.');
      return;
    }

    client.leave(`post_room_${data.postId}`);
    console.log(`Client ${client.id} left post room: post_room_${data.postId}`);
  }
}