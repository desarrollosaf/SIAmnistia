import { ROLES_PRIVILEGIADOS } from '../common/amnistia.constants';

/** Contenido del JWT, disponible en req['user'] tras pasar por JwtAuthGuard. */
export interface UsuarioActual {
  sub: number;
  email: string;
  institucionId: number;
  institucion: string;
  /** Usuario del Poder Legislativo: administra el flujo (acepta, turna, resuelve). */
  legislativo: boolean;
  /** Usuario del Poder Judicial: es quien concluye la solicitud tras la resolución. */
  judicial: boolean;
  roles: string[];
}

export function esPrivilegiado(user: UsuarioActual): boolean {
  return user.roles.some((r) => ROLES_PRIVILEGIADOS.includes(r));
}
