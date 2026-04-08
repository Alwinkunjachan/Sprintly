import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { GoogleCallbackComponent } from './google-callback/google-callback.component';
import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'google/callback', component: GoogleCallbackComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
