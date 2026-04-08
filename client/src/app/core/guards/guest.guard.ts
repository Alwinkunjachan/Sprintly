import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (localStorage.getItem('access_token')) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
