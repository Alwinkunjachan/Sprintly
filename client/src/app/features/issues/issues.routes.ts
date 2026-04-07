import { Routes } from '@angular/router';
import { IssueListComponent } from './issue-list/issue-list.component';
import { IssueDetailComponent } from './issue-detail/issue-detail.component';

export const ISSUE_ROUTES: Routes = [
  { path: '', component: IssueListComponent },
  { path: ':id', component: IssueDetailComponent },
];
