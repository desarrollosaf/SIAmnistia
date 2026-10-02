import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  // Los documentos de las solicitudes contienen datos personales: no se publica uploads/ como
  // estático; se sirven por /documentos/:uuid/archivo (con sesión) o por el acuse público.
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
