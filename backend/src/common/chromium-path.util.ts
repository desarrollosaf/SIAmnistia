import { existsSync } from 'fs';

/**
 * Ruta al ejecutable de Chrome/Chromium para puppeteer-core (no se usa el Chromium que
 * puppeteer normalmente descarga por su cuenta, porque en el contenedor de producción
 * (node:24-alpine) esa descarga no funciona bien con musl libc).
 *
 * En el servidor, el Dockerfile instala `chromium` vía apk y se define
 * PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser en el entorno; aquí en desarrollo
 * (Mac/Windows) se cae en las rutas típicas de Google Chrome ya instalado.
 */
export function rutaChromium(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidatos = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const encontrado = candidatos.find((ruta) => existsSync(ruta));
  if (!encontrado) {
    throw new Error(
      'No se encontró un navegador Chrome/Chromium instalado. Define PUPPETEER_EXECUTABLE_PATH.',
    );
  }
  return encontrado;
}
