import { Module } from '@nestjs/common';
import { MusicResolver } from './music.resolver';
import { MusicService } from './music.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [MusicResolver, MusicService, PrismaService],
})
export class MusicModule {}