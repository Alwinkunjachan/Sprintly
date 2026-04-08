import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for profile to load so we know the role
  await authService.authReady;

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
