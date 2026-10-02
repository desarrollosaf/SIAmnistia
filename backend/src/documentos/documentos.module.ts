import { Module } from '@nestjs/common';
import { SolicitudesModule } from '../solicitudes/solicitudes.module';
import { DocumentosController } from './documentos.controller';

@Module({
  imports: [SolicitudesModule],
  controllers: [DocumentosController],
})
export class DocumentosModule {}
