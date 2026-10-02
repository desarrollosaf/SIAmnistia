/**
 * Valores de catálogo que el flujo usa por nombre (no por id), igual que el sistema Laravel:
 * los ids pueden variar entre una base nueva y una importada.
 */

export const INSTITUCION = {
  legislativo: 'PODER LEGISLATIVO DEL ESTADO DE MÉXICO',
  judicial: 'PODER JUDICIAL DEL ESTADO DE MÉXICO',
} as const;

export const ESTATUS_SOLICITUD = {
  registrada: 'REGISTRADA',
  enEvaluacion: 'EN EVALUACIÓN',
  terminada: 'TERMINADA',
  noProcede: 'NO PROCEDE',
  concluida: 'CONCLUIDA',
} as const;

export const ESTATUS_TURNO = {
  turnada: 'TURNADA',
  enEvaluacion: 'EN EVALUACIÓN',
  terminada: 'TERMINADA',
  prevencion: 'PREVENCIÓN',
} as const;

export const RECOMENDACION_OPINION_CONSULTIVA = 'Opinión consultiva';

export const ROL = {
  superUsuario: 'Super usuario',
  institucion: 'Institucion',
  revisor: 'Revisor',
  registro: 'Registro',
} as const;

/** Roles que ven todas las solicitudes, no solo las que se les turnaron. */
export const ROLES_PRIVILEGIADOS: string[] = [ROL.superUsuario, ROL.registro, ROL.revisor];

/** Horas que tiene una institución para acusar de recibido un turno antes de darlo por recibido. */
export const HORAS_ACUSE_TURNO = 72;

/** Tamaño máximo por archivo PDF (el formulario anterior aceptaba hasta 125 MB). */
export const MAX_PDF_BYTES = 125 * 1024 * 1024;
