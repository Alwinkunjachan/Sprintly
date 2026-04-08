import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Synchronous check — token in localStorage means user is logged in
  if (localStorage.getItem('access_token')) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};
