import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SOLO_LEGISLATIVO_KEY } from '../decorators/usuario.decorator';
import type { UsuarioActual } from '../usuario-actual';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const objetivos = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, objetivos);
    const soloLegislativo = this.reflector.getAllAndOverride<boolean>(SOLO_LEGISLATIVO_KEY, objetivos);

    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as UsuarioActual | undefined;

    if (soloLegislativo && !user?.legislativo) {
      throw new ForbiddenException('Solo el Poder Legislativo puede realizar esta acción');
    }

    if (requiredRoles?.length && !user?.roles?.some((r) => requiredRoles.includes(r))) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }

    return true;
  }
}
