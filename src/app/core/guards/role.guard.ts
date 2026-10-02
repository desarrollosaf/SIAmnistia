import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowed: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = auth.currentUser()?.roles ?? [];

  if (roles.some((rol) => allowed.includes(rol))) {
    return true;
  }

  return router.parseUrl('/inicio');
};
