import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // URL pública del frontend, para las ligas de los correos y el QR del acuse.
  url: (process.env.APP_URL ?? 'http://localhost:4200').replace(/\/+$/, ''),
  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    username: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM ?? 'Sistema de Amnistía <no-reply@localhost>',
  },
}));
