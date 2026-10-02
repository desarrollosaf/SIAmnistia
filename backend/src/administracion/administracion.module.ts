import { Module } from '@nestjs/common';
import { AdministracionController } from './administracion.controller';
import { UsuariosService } from './usuarios.service';
import { CatalogosAdminService } from './catalogos-admin.service';

@Module({
  controllers: [AdministracionController],
  providers: [UsuariosService, CatalogosAdminService],
})
export class AdministracionModule {}
