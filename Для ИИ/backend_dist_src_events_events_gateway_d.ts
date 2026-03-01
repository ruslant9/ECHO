import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private usersService;
    private jwtService;
    server: Server;
    constructor(usersService: UsersService, jwtService: JwtService);
    sendNewSessionNotification(userId: number, newSession: any, currentToken: string): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    sendNotificationToUser(userId: number, notification: any): void;
    handleTyping(data: {
        conversationId: number;
    }, client: Socket): Promise<void>;
    handleJoinPostRoom(client: Socket, data: {
        postId: number;
    }): void;
    handleJoinProfileRoom(client: Socket, data: {
        userId: number;
    }): void;
    handleLeaveProfileRoom(client: Socket, data: {
        userId: number;
    }): void;
    handleLeavePostRoom(client: Socket, data: {
        postId: number;
    }): void;
}
