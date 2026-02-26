import { Module } from '@nestjs/common';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [AdminResolver, AdminService, PrismaService],
})
export class AdminModule {}