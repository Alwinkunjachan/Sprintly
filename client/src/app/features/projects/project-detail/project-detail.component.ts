import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { IssueRowComponent } from '../../issues/issue-row/issue-row.component';
import { IssueCreateDialogComponent } from '../../issues/issue-create-dialog/issue-create-dialog.component';
import { CycleCreateDialogComponent } from '../../cycles/cycle-create-dialog/cycle-create-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProjectsService } from '../services/projects.service';
import { IssuesService } from '../../issues/services/issues.service';
import { CyclesService } from '../../cycles/services/cycles.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Project } from '../../../core/models/project.model';
import { Issue, IssueStatus } from '../../../core/models/issue.model';
import { Cycle } from '../../../core/models/cycle.model';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTabsModule,
    IssueRowComponent, EmptyStateComponent,
  ],
  template: `
    @if (project(); as proj) {
      <div class="project-detail">
        <div class="page-header">
          <div class="header-left">
            <button mat-icon-button (click)="router.navigate(['/projects'])">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="project-icon">{{ proj.identifier.charAt(0) }}</div>
            <div>
              <h1>{{ proj.name }}</h1>
              <span class="project-identifier">{{ proj.identifier }} &middot; {{ proj.issueCount || 0 }} issues</span>
            </div>
          </div>
          <div class="header-actions">
            <button mat-stroked-button (click)="openCreateCycle()">
              <mat-icon>schedule</mat-icon>
              New Cycle
            </button>
            <button mat-flat-button color="primary" (click)="openCreateIssue()">
              <mat-icon>add</mat-icon>
              New Issue
            </button>
            <button mat-icon-button color="warn" (click)="deleteProject()">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </div>
        </div>

        @if (proj.description) {
          <p class="project-description">{{ proj.description }}</p>
        }

        <!-- Tabs: Issues / Cycles -->
        <mat-tab-group class="project-tabs" animationDuration="0"
                       [selectedIndex]="activeTab"
                       (selectedIndexChange)="activeTab = $event">
          <mat-tab label="Issues">
            <div class="tab-content">
              @for (issue of issues(); track issue.id) {
                <app-issue-row [issue]="issue" (statusChange)="onStatusChange($event)" />
              } @empty {
                <app-empty-state
                  icon="check_circle_outline"
                  title="No issues in this project"
                  description="Create an issue to get started." />
              }
            </div>
          </mat-tab>
          <mat-tab label="Cycles">
            <div class="tab-content">
              @for (cycle of cycles(); track cycle.id) {
                <a class="cycle-row" [routerLink]="['/cycles', cycle.id]">
                  <mat-icon class="cycle-icon">schedule</mat-icon>
                  <div class="cycle-info">
                    <span class="cycle-name">{{ cycle.name }}</span>
                    <span class="cycle-dates">{{ cycle.startDate }} &mdash; {{ cycle.endDate }}</span>
                  </div>
                  <span class="cycle-status" [class]="'status-' + cycle.status">{{ cycle.status }}</span>
                </a>
              } @empty {
                <app-empty-state
                  icon="schedule"
                  title="No cycles in this project"
                  description="Create a cycle to organize sprints." />
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    }
  `,
  styles: [`
    .project-detail { height: 100%; display: flex; flex-direction: column; }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h1 { font-size: 18px; font-weight: 600; margin: 0; color: var(--text-primary); }
    .project-identifier { font-size: 12px; color: var(--text-tertiary); }
    .project-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--accent-primary); color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700;
    }
    .project-description {
      padding: 0 20px;
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0 0 8px;
    }

    .project-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      ::ng-deep .mat-mdc-tab-body-wrapper {
        flex: 1;
        overflow: hidden;
      }
    }

    .tab-content {
      height: 100%;
      overflow: auto;
    }

    .cycle-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--surface-border);
      text-decoration: none;
      transition: background 100ms;

      &:hover {
        background: var(--row-hover);
      }
    }

    .cycle-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-tertiary);
    }

    .cycle-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cycle-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .cycle-dates {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .cycle-status {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: capitalize;
    }
    .status-upcoming { background: var(--surface-border); color: var(--text-secondary); }
    .status-active { background: #f5a62320; color: #f5a623; }
    .status-completed { background: #4caf5020; color: #4caf50; }
  `]
})
export class ProjectDetailComponent implements OnInit {
  project = signal<Project | null>(null);
  issues = signal<Issue[]>([]);
  cycles = signal<Cycle[]>([]);
  activeTab = 0;
  private projectId = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private projectsService: ProjectsService,
    private issuesService: IssuesService,
    private cyclesService: CyclesService,
    private notification: NotificationService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((qp) => {
      if (qp['tab'] === 'cycles') this.activeTab = 1;
    });
    this.route.params.subscribe((params) => {
      this.projectId = params['id'];
      this.loadProject();
      this.loadIssues();
      this.loadCycles();
    });
  }

  loadProject() {
    this.projectsService.getById(this.projectId).subscribe({
      next: (p) => this.project.set(p),
    });
  }

  loadIssues() {
    this.issuesService.getAll({ projectId: this.projectId }).subscribe({
      next: (issues) => this.issues.set(issues),
    });
  }

  loadCycles() {
    this.cyclesService.getAll(this.projectId).subscribe({
      next: (cycles) => this.cycles.set(cycles),
    });
  }

  onStatusChange(event: { id: string; status: IssueStatus }) {
    this.issuesService.update(event.id, { status: event.status }).subscribe({
      next: () => this.loadIssues(),
    });
  }

  openCreateIssue() {
    const ref = this.dialog.open(IssueCreateDialogComponent, {
      width: '750px',
      maxHeight: '90vh',
      data: { projectId: this.projectId },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.issuesService.create(result).subscribe({
          next: (issue) => {
            this.notification.success(`Issue ${issue.identifier} created`);
            this.loadIssues();
            this.loadProject();
          },
        });
      }
    });
  }

  openCreateCycle() {
    const ref = this.dialog.open(CycleCreateDialogComponent, {
      width: '700px',
      data: { projectId: this.projectId },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.cyclesService.create(result).subscribe({
          next: () => {
            this.notification.success('Cycle created');
            this.loadCycles();
          },
          error: () => this.notification.error('Failed to create cycle'),
        });
      }
    });
  }

  deleteProject() {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Project', message: 'This will delete the project and all its issues. Continue?' },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.projectsService.delete(this.projectId).subscribe({
          next: () => {
            this.notification.success('Project deleted');
            this.router.navigate(['/projects']);
          },
        });
      }
    });
  }
}
