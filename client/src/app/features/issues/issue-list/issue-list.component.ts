import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { IssueRowComponent } from '../issue-row/issue-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IssueCreateDialogComponent } from '../issue-create-dialog/issue-create-dialog.component';
import { IssuesService } from '../services/issues.service';
import { MembersService } from '../services/members.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Issue, IssueStatus, IssueFilters, ISSUE_STATUSES, ISSUE_PRIORITIES } from '../../../core/models/issue.model';
import { Member } from '../../../core/models/member.model';
import { Project } from '../../../core/models/project.model';
import { ProjectsService } from '../../projects/services/projects.service';

@Component({
  selector: 'app-issue-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatPaginatorModule,
    IssueRowComponent, EmptyStateComponent,
  ],
  template: `
    <div class="issue-list-page">
      <!-- Header -->
      <div class="page-header">
        <h1>Issues</h1>
        <button mat-flat-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          New Issue
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <mat-form-field appearance="outline" class="filter-field search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput placeholder="Search" [(ngModel)]="filters.search" (ngModelChange)="onFilterChange()">
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-select [(ngModel)]="filters.projectId" (selectionChange)="onFilterChange()" placeholder="Project">
            <mat-option value="">All</mat-option>
            @for (project of projects(); track project.id) {
              <mat-option [value]="project.id">{{ project.identifier }} - {{ project.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-select [(ngModel)]="filters.status" (selectionChange)="onFilterChange()" placeholder="Status">
            <mat-option value="">All</mat-option>
            @for (s of statuses; track s.value) {
              <mat-option [value]="s.value">{{ s.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-select [(ngModel)]="filters.priority" (selectionChange)="onFilterChange()" placeholder="Priority">
            <mat-option value="">All</mat-option>
            @for (p of priorities; track p.value) {
              <mat-option [value]="p.value">{{ p.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-select [(ngModel)]="filters.assigneeId" (selectionChange)="onFilterChange()" placeholder="Assignee">
            <mat-option value="">All</mat-option>
            @for (member of members(); track member.id) {
              <mat-option [value]="member.id">{{ member.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Issue List -->
      <div class="issue-list">
        @for (issue of issues(); track issue.id) {
          <app-issue-row
            [issue]="issue"
            (statusChange)="onStatusChange($event)" />
        } @empty {
          <app-empty-state
            icon="check_circle_outline"
            title="No issues found"
            description="Create your first issue to get started." />
        }
      </div>

      <mat-paginator
        [length]="totalIssues()"
        [pageSize]="pageSize"
        [pageIndex]="pageIndex"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="onPageChange($event)"
        showFirstLastButtons />
    </div>
  `,
  styles: [`
    .issue-list-page {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;

      h1 {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        color: var(--text-primary);
      }
    }

    .filters-bar {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 0 20px 8px;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        height: 0;
        overflow: hidden;
      }
    }

    .filter-field {
      font-size: 13px;

      ::ng-deep .mat-mdc-floating-label {
        top: 50% !important;
      }

      ::ng-deep .mat-mdc-floating-label.mdc-floating-label--float-above {
        top: 28px !important;
      }
    }

    .search-field {
      flex: 1;
      max-width: 280px;
    }

    .issue-list {
      flex: 1;
      overflow: auto;
    }

    mat-paginator {
      border-top: 1px solid var(--surface-border);
      background: transparent;
    }
  `]
})
export class IssueListComponent implements OnInit {
  issues = signal<Issue[]>([]);
  totalIssues = signal(0);
  members = signal<Member[]>([]);
  projects = signal<Project[]>([]);
  statuses = ISSUE_STATUSES;
  priorities = ISSUE_PRIORITIES;

  filters: IssueFilters = {};
  pageIndex = 0;
  pageSize = 25;

  constructor(
    private issuesService: IssuesService,
    private membersService: MembersService,
    private projectsService: ProjectsService,
    private notification: NotificationService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.loadIssues();
    this.membersService.getAll().subscribe((m) => this.members.set(m));
    this.projectsService.getAll().subscribe((p) => this.projects.set(p));
  }

  loadIssues() {
    const paginatedFilters: IssueFilters = {
      ...this.filters,
      page: String(this.pageIndex + 1),
      pageSize: String(this.pageSize),
    };
    this.issuesService.getAllPaginated(paginatedFilters).subscribe({
      next: (res) => {
        this.issues.set(res.data);
        this.totalIssues.set(res.total);
      },
      error: () => this.notification.error('Failed to load issues'),
    });
  }

  onFilterChange() {
    this.pageIndex = 0;
    this.loadIssues();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadIssues();
  }

  onStatusChange(event: { id: string; status: IssueStatus }) {
    this.issuesService.update(event.id, { status: event.status }).subscribe({
      next: () => {
        this.loadIssues();
        this.notification.success('Status updated');
      },
      error: () => this.notification.error('Failed to update status'),
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(IssueCreateDialogComponent, {
      width: '750px',
      maxHeight: '90vh',
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.issuesService.create(result).subscribe({
          next: (issue) => {
            this.notification.success(`Issue ${issue.identifier} created`);
            this.loadIssues();
          },
          error: () => this.notification.error('Failed to create issue'),
        });
      }
    });
  }
}
