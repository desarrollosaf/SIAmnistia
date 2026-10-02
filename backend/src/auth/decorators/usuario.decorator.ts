import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioActual } from '../usuario-actual';

/** Inyecta el usuario autenticado (payload del JWT) en el parámetro del handler. */
export const Usuario = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioActual =>
    ctx.switchToHttp().getRequest<Request>()['user'] as UsuarioActual,
);

export const SOLO_LEGISLATIVO_KEY = 'soloLegislativo';
/** Restringe el endpoint a usuarios del Poder Legislativo (lo valida RolesGuard). */
export const SoloLegislativo = () => SetMetadata(SOLO_LEGISLATIVO_KEY, true);
