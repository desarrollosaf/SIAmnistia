import { Routes } from '@angular/router';
import { ConfigCatalogo } from './catalogo/catalogo-admin';

const catalogo = (config: ConfigCatalogo) => ({
  loadComponent: () => import('./catalogo/catalogo-admin').then((m) => m.CatalogoAdmin),
  data: { config },
});

export const ADMINISTRACION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
  {
    path: 'usuarios',
    loadComponent: () => import('./usuarios/usuarios-admin').then((m) => m.UsuariosAdmin),
  },
  {
    path: 'roles',
    ...catalogo({
      titulo: 'Roles',
      descripcion: 'Roles que se asignan a los usuarios. "Super usuario" administra el sistema; "Registro" y "Revisor" ven todas las solicitudes.',
      recurso: 'roles',
      singular: 'rol',
      columnas: [{ campo: 'nombre', titulo: 'Rol' }, { campo: 'usuarios', titulo: 'Usuarios', numero: true }],
      campos: [{ clave: 'nombre', etiqueta: 'Nombre del rol', tipo: 'texto' }],
    }),
  },
  {
    path: 'instituciones',
    ...catalogo({
      titulo: 'Instituciones',
      descripcion: 'Instituciones a las que se turnan las solicitudes para su opinión consultiva.',
      recurso: 'instituciones',
      singular: 'institución',
      columnas: [
        { campo: 'nombre', titulo: 'Institución' },
        { campo: 'email', titulo: 'Correo' },
        { campo: 'usuarios', titulo: 'Usuarios', numero: true },
      ],
      campos: [
        { clave: 'nombre', etiqueta: 'Nombre de la institución', tipo: 'texto', mayusculas: true },
        { clave: 'email', etiqueta: 'Correo de la institución', tipo: 'email' },
      ],
      suspensiones: true,
    }),
  },
  {
    path: 'delitos',
    ...catalogo({
      titulo: 'Delitos',
      descripcion: 'Delitos que el peticionario puede elegir en el formulario. "OTRO" permite escribir un delito que no esté en la lista.',
      recurso: 'delitos',
      singular: 'delito',
      columnas: [{ campo: 'delito', titulo: 'Delito' }, { campo: 'modalidades', titulo: 'Modalidades', numero: true }],
      campos: [{ clave: 'delito', etiqueta: 'Delito', tipo: 'texto', mayusculas: true }],
    }),
  },
  {
    path: 'modalidades',
    ...catalogo({
      titulo: 'Modalidades de delitos',
      descripcion: 'Supuestos de la Ley de Amnistía para cada delito; el peticionario elige uno al capturar el delito.',
      recurso: 'modalidades',
      singular: 'modalidad',
      columnas: [{ campo: 'delito', titulo: 'Delito' }, { campo: 'nombre', titulo: 'Modalidad' }],
      campos: [
        { clave: 'delitoId', etiqueta: 'Delito', tipo: 'select', opciones: 'delitos' },
        { clave: 'nombre', etiqueta: 'Modalidad', tipo: 'textarea' },
      ],
    }),
  },
  {
    path: 'generos',
    ...catalogo({
      titulo: 'Géneros',
      descripcion: 'Opciones de género del formulario. "OTRO" pide especificar el género.',
      recurso: 'generos',
      singular: 'género',
      columnas: [{ campo: 'nombre', titulo: 'Género' }],
      campos: [{ clave: 'nombre', etiqueta: 'Género', tipo: 'texto', mayusculas: true }],
    }),
  },
  {
    path: 'contadores',
    ...catalogo({
      titulo: 'Folios (contadores)',
      descripcion: 'Consecutivo anual del número único de solicitud. "Siguiente folio" es el que se asignará a la próxima solicitud del año.',
      recurso: 'contadores',
      singular: 'contador',
      columnas: [
        { campo: 'anio', titulo: 'Año' },
        { campo: 'tipo', titulo: 'Tipo' },
        { campo: 'numero', titulo: 'Siguiente folio', numero: true },
      ],
      campos: [{ clave: 'numero', etiqueta: 'Siguiente folio', tipo: 'numero' }],
      sinAlta: true,
      sinBaja: true,
    }),
  },
];
