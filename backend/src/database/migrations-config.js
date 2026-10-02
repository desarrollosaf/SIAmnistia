require('dotenv').config();

const base = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  dialect: 'mysql',
  // Fechas en hora de México: los registros heredados del sistema Laravel se guardaron así.
  timezone: '-06:00',
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
