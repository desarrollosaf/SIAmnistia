import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import appConfig from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ComunModule } from './comun/comun.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { PublicoModule } from './publico/publico.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { DocumentosModule } from './documentos/documentos.module';
import { SuspensionesModule } from './suspensiones/suspensiones.module';
import { AdministracionModule } from './administracion/administracion.module';
import { TareasModule } from './tareas/tareas.module';

interface MysqlConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig, appConfig],
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): SequelizeModuleOptions => {
        const db = config.get<MysqlConnectionConfig>('database.main')!;
        return {
          dialect: 'mysql',
          ...db,
          // Hora de México: así se guardaron los registros del sistema anterior.
          timezone: '-06:00',
          models: [],
          autoLoadModels: true,
          synchronize: false,
          logging: false,
        };
      },
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    ComunModule,
    AuthModule,
    CatalogosModule,
    PublicoModule,
    SolicitudesModule,
    DocumentosModule,
    SuspensionesModule,
    AdministracionModule,
    TareasModule,
  ],
})
export class AppModule {}
