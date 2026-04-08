import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleRedirectGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for profile to load so we know the role
  await authService.authReady;

  if (authService.isAdmin()) {
    router.navigate(['/issues']);
  } else {
    router.navigate(['/my-issues']);
  }
  return false;
};
