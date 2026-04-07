import { Routes } from '@angular/router';
import { CycleDetailComponent } from './cycle-detail/cycle-detail.component';

export const CYCLE_ROUTES: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: ':id', component: CycleDetailComponent },
];
