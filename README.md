# SIAmnistia

Sistema de Amnistía del Poder Legislativo del Estado de México, migrado del proyecto Laravel
`amnistia` (Materialize) a **Angular 22 + Bootstrap 5** en el frontend y **NestJS 11 + Sequelize
(MySQL/MariaDB)** en el backend, con la misma estructura que SIPresupuesto.

## Estructura

```
SIAmnistia/
├── src/app/                      Frontend Angular
│   ├── core/                     guards, interceptor (JWT) y servicios HTTP
│   ├── layout/shell              barra superior del sistema interno (Bootstrap navbar)
│   ├── layout/publico            marco de las páginas públicas
│   ├── features/
│   │   ├── registro/             formulario público de solicitud (7 pasos)
│   │   ├── consulta/             consulta del peticionario por liga enviada a su correo
│   │   ├── acuse/                abrir acuse (liga del correo) y validar acuse (QR)
│   │   ├── login/  inicio/
│   │   ├── solicitudes/          listado (ag-grid) y detalle con pestañas y acciones del flujo
│   │   └── administracion/       usuarios + catálogos (roles, instituciones, delitos, modalidades, géneros, folios)
│   └── shared/                   modal, selector de PDF, íconos, suspensiones, celdas de ag-grid, toasts
└── backend/src/                  Backend NestJS
    ├── auth/                     login por correo, JWT, guards (roles y "solo Legislativo")
    ├── comun/                    archivos, PDFs (acuse con QR, ficha técnica), correo SMTP, folios
    ├── publico/                  registro público, acuse, consulta por token
    ├── solicitudes/              listado, detalle, flujo, turnos, documentos, Excel
    ├── documentos/               descarga de documentos con control de acceso
    ├── suspensiones/             suspensión de términos (solicitud o institución)
    ├── administracion/           usuarios y catálogos (Super usuario)
    ├── tareas/                   cron: turnos sin acuse en 72 h pasan a EN EVALUACIÓN
    └── database/                 modelos, migraciones (sequelize-cli) y catálogos JSON
```

## Puesta en marcha (local, sin Docker)

Requisitos: Node 24, MySQL 8 o MariaDB 10.5+, Google Chrome (para generar los PDFs).

```bash
cd backend
cp .env.example .env        # captura BD, JWT_SECRET, APP_URL, SMTP y ROOT_PASSWORD
npm install
npm run migrate             # crea tablas, catálogos y el usuario ROOT
npm run start:dev           # http://localhost:3050

cd ..
npm install
npm start                   # http://localhost:4200 (proxy /api -> backend)
```

Usuario inicial: `root@amnistia.gob.mx` con la contraseña de `ROOT_PASSWORD`
(si lleva `#`, escríbela entre comillas en el `.env`).

## Docker

- Desarrollo: `docker compose up` (frontend en 4230, backend en 3075; el contenedor del backend
  instala Chromium para los PDFs).
- Producción: `docker compose -f docker-compose.prod.yml up -d --build`. El frontend se compila con
  `base-href /amnistia/` y espera el backend en `/amnistia/backend` (igual que SIPresupuesto con
  `/presupuesto/backend`): configura esa ruta en el nginx del servidor hacia el puerto 3036.
  Ajusta `APP_URL` a la URL pública (p. ej. `https://servidor/amnistia`), porque con ella se arman las
  ligas de los correos y el QR del acuse.

## Migrar los datos del sistema Laravel

El esquema conserva **los mismos nombres de tabla y columna** que la base de amnistía (incluidas
`roles`/`model_has_roles` de Spatie y los `*_type` polimórficos `App\Models\...`), así que no hay que
transformar datos:

1. Importa el respaldo en la base nueva:
   `mysql -u usuario -p amnistia < dump-amnistiar.sql`
2. Corre `npm run migrate`. Las tablas existentes se respetan (`CREATE TABLE IF NOT EXISTS`) y solo se
   agrega lo que faltaba en producción: columna `solicitud_users.prevencion`, estatus `PREVENCIÓN` y
   `CONCLUIDA`, rol `Registro` y la tabla `tokens_consulta`. Los catálogos no se duplican.
3. Copia los archivos: `storage/app/solicitud/` del Laravel → `backend/uploads/solicitud/`.
   La columna `documentos.ruta` ya apunta a `solicitud/{id}/archivo.pdf`.
4. Los usuarios entran con su mismo correo y contraseña (los hashes `$2y$` de Laravel son compatibles).

Se probó con el respaldo del 01/10/2026: las 18 migraciones aplican sin errores y el sistema lista las
816 solicitudes vigentes con sus turnos, documentos y usuarios.

## Flujo de una solicitud

| Quién | Acción | Resultado |
|---|---|---|
| Peticionario (público) | Registra en `/registro` | `REGISTRADA`; se generan acuse con QR, narrativas y ficha técnica; se envía el acuse por correo |
| Poder Legislativo | Aceptar / Negar (con PDF) | `EN EVALUACIÓN` / `NO PROCEDE` |
| Poder Legislativo | Turnar a usuarios de otras instituciones (una por institución) | Turno `TURNADA` + correo a la institución |
| Institución | Indicar recepción (o automático a las 72 h, descontando suspensiones) | Turno `EN EVALUACIÓN` |
| Institución | Prevención (PDF) → el Legislativo responde (PDF) | Turno `PREVENCIÓN` → `EN EVALUACIÓN` |
| Institución | Opinión consultiva (PDF) | Turno `TERMINADA` |
| Poder Legislativo | Resolución (tipo + PDF) | Solicitud `TERMINADA`; se abre turno al Poder Judicial |
| Poder Judicial | Concluir (PDF) | Solicitud `CONCLUIDA` |

Permisos: el **Poder Legislativo** (por institución) administra el flujo; los roles **Super usuario,
Registro y Revisor** ven todas las solicitudes; las demás instituciones solo ven lo que se les turnó.
Administración (usuarios y catálogos) es solo para **Super usuario**.

## Cambios respecto al sistema Laravel

- Los documentos ya no son públicos por su UUID: se descargan con sesión y validando acceso a la
  solicitud; solo el **acuse** queda público (para la liga del correo y el QR).
- La validación del QR (`/validar-acuse/:cadena`) existía en el controlador pero no tenía ruta; ahora funciona.
- La suspensión guardaba `fecha_fin` igual a la fecha de inicio; ahora respeta el rango capturado.
- El plazo de 72 horas descuenta cualquier suspensión que se traslape con el turno (antes solo las futuras).
- Al regenerar documentos, la ficha técnica incluía la información complementaria en lugar de la sentencia.
- El folio se toma con bloqueo de fila para que dos registros simultáneos no repitan NUS.
- Los tokens de consulta se guardan en BD (antes en caché) y la narrativa capturada se renderiza al PDF
  sin JavaScript ni acceso a red.
- Se quitaron las tablas que el sistema ya no usaba (`movimientos`, `diputados`, `solicitudes_delitos`,
  `carpetas_solicitudes`, `permissions`), y el campo "etapa procesal" que el formulario pedía pero no se guardaba.

## Pendientes a revisar

- `backend/src/pdf/assets/encabezado.jpg` es el encabezado del acuse original y trae la leyenda
  "2021. Año de la Consumación…"; reemplázalo por el vigente.
- Configura el SMTP (`MAIL_*`); sin él los correos solo se registran en el log del backend.
