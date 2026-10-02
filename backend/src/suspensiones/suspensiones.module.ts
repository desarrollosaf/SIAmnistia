import { Module } from '@nestjs/common';
import { SuspensionesController } from './suspensiones.controller';
import { SuspensionesService } from './suspensiones.service';

@Module({
  controllers: [SuspensionesController],
  providers: [SuspensionesService],
})
export class SuspensionesModule {}
