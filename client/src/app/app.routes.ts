import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'issues', pathMatch: 'full' },
      {
        path: 'issues',
        loadChildren: () =>
          import('./features/issues/issues.routes').then((m) => m.ISSUE_ROUTES),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/projects.routes').then((m) => m.PROJECT_ROUTES),
      },
      {
        path: 'cycles',
        loadChildren: () =>
          import('./features/cycles/cycles.routes').then((m) => m.CYCLE_ROUTES),
      },
      {
        path: 'labels',
        loadChildren: () =>
          import('./features/labels/labels.routes').then((m) => m.LABEL_ROUTES),
      },
    ],
  },
];
