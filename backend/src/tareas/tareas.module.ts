import { Module } from '@nestjs/common';
import { CambioEstatusTurnosTask } from './cambio-estatus-turnos.task';

@Module({
  providers: [CambioEstatusTurnosTask],
})
export class TareasModule {}
