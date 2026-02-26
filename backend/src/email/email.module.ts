import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [EmailService, PrismaService], // Added PrismaService here
  exports: [EmailService],
})
export class EmailModule {}