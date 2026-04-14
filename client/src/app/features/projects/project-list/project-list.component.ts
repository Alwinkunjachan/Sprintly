import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ProjectCreateDialogComponent } from '../project-create-dialog/project-create-dialog.component';
import { ProjectsService } from '../services/projects.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatPaginatorModule, EmptyStateComponent],
  template: `
    <div class="project-list-page">
      <div class="page-header">
        <h1>Projects</h1>
        <button mat-flat-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          New Project
        </button>
      </div>

      <div class="project-grid">
        @for (project of projects(); track project.id) {
          <a [routerLink]="['/projects', project.id]" class="project-card">
            <div class="project-icon">{{ project.identifier.charAt(0) }}</div>
            <div class="project-info">
              <div class="project-name">{{ project.name }}</div>
              <div class="project-meta">
                <span class="project-identifier">{{ project.identifier }}</span>
                <span class="project-issues">{{ project.issueCount || 0 }} issues</span>
              </div>
              @if (project.description) {
                <div class="project-desc">{{ project.description }}</div>
              }
            </div>
          </a>
        } @empty {
          <app-empty-state
            icon="folder_open"
            title="No projects yet"
            description="Create your first project to start tracking issues." />
        }
      </div>

      <mat-paginator
        [length]="totalProjects()"
        [pageSize]="pageSize"
        [pageIndex]="pageIndex"
        [pageSizeOptions]="[12, 24, 48]"
        (page)="onPageChange($event)"
        showFirstLastButtons />
    </div>
  `,
  styles: [`
    .project-list-page {
      padding: 0;
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

    .project-grid {
      padding: 0 20px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 12px;
      align-content: start;
      flex: 1;
      overflow: auto;

      app-empty-state {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
      }
    }

    .project-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px;
      background: var(--surface-raised);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      text-decoration: none;
      transition: all 150ms ease;

      &:hover {
        border-color: var(--accent-primary);
        background: var(--row-hover);
      }
    }

    .project-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--accent-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .project-info { min-width: 0; }

    .project-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .project-meta {
      display: flex;
      gap: 8px;
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .project-identifier {
      font-weight: 500;
    }

    .project-desc {
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    mat-paginator {
      border-top: 1px solid var(--surface-border);
      background: transparent;
    }
  `]
})
export class ProjectListComponent implements OnInit {
  projects = signal<Project[]>([]);
  totalProjects = signal(0);
  pageIndex = 0;
  pageSize = 12;

  constructor(
    private projectsService: ProjectsService,
    private notification: NotificationService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectsService.getAllPaginated(this.pageIndex + 1, this.pageSize).subscribe({
      next: (res) => {
        this.projects.set(res.data);
        this.totalProjects.set(res.total);
      },
      error: () => this.notification.error('Failed to load projects'),
    });
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProjects();
  }

  openCreateDialog() {
    const ref = this.dialog.open(ProjectCreateDialogComponent, { width: '700px' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.projectsService.create(result).subscribe({
          next: () => {
            this.notification.success('Project created');
            this.loadProjects();
          },
          error: () => this.notification.error('Failed to create project'),
        });
      }
    });
  }
}
