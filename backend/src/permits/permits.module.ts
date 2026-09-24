import { Module } from '@nestjs/common';
import { PermitsService } from './permits.service';
import { PermitsController } from './permits.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PermitsController],
  providers: [PermitsService],
  exports: [PermitsService],
})
export class PermitsModule {}
