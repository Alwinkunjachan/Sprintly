import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
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
