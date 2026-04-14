import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { IssueRowComponent } from '../../issues/issue-row/issue-row.component';
import { IssueBoardComponent } from '../../issues/issue-board/issue-board.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CyclesService } from '../services/cycles.service';
import { IssuesService } from '../../issues/services/issues.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Cycle } from '../../../core/models/cycle.model';
import { Issue, IssueStatus } from '../../../core/models/issue.model';

@Component({
  selector: 'app-cycle-detail',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, MatButtonToggleModule,
    IssueRowComponent, IssueBoardComponent, EmptyStateComponent,
  ],
  template: `
    @if (cycle(); as c) {
      <div class="cycle-detail">
        <div class="page-header">
          <div class="header-left">
            <button mat-icon-button (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1>{{ c.name }}</h1>
              <span class="cycle-meta">
                {{ c.startDate }} &mdash; {{ c.endDate }}
                <span class="cycle-status" [class]="'status-' + c.status">{{ c.status }}</span>
              </span>
            </div>
          </div>
          <div class="header-right">
            <mat-button-toggle-group [value]="viewMode" (change)="viewMode = $event.value" class="view-toggle" hideSingleSelectionIndicator>
              <mat-button-toggle value="list" aria-label="List view">
                <mat-icon>view_list</mat-icon>
              </mat-button-toggle>
              <mat-button-toggle value="board" aria-label="Board view">
                <mat-icon>view_kanban</mat-icon>
              </mat-button-toggle>
            </mat-button-toggle-group>
            <button mat-icon-button color="warn" (click)="deleteCycle()">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </div>
        </div>

        @if (viewMode === 'list') {
          <div class="issue-list">
            @for (issue of c.issues; track issue.id) {
              <app-issue-row [issue]="issue" (statusChange)="onStatusChange($event)" />
            } @empty {
              <app-empty-state
                icon="replay"
                title="No issues in this cycle"
                description="Assign issues to this cycle from the issue detail view." />
            }
          </div>
        } @else {
          <app-issue-board
            [issues]="cycleIssues"
            (statusChange)="onStatusChange($event)" />
        }
      </div>
    }
  `,
  styles: [`
    .cycle-detail { height: 100%; display: flex; flex-direction: column; }
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-right { display: flex; align-items: center; gap: 8px; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; color: var(--text-primary); }
    .cycle-meta { font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; gap: 8px; }
    .cycle-status {
      font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 10px; text-transform: capitalize;
    }
    .status-upcoming { background: var(--surface-border); color: var(--text-secondary); }
    .status-active { background: #f5a62320; color: #f5a623; }
    .status-completed { background: #4caf5020; color: #4caf50; }
    .issue-list { flex: 1; overflow: auto; }

    .view-toggle {
      ::ng-deep {
        .mat-button-toggle-group {
          border: 1px solid var(--surface-border);
          border-radius: 6px;
        }

        .mat-button-toggle {
          background: transparent;
          border: none;

          .mat-button-toggle-button {
            height: 32px;
            width: 36px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .mat-button-toggle-label-content {
            padding: 0;
            line-height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
            color: var(--text-tertiary);
          }

          &.mat-button-toggle-checked .mat-icon {
            color: var(--accent-primary);
          }
        }

        .mat-button-toggle + .mat-button-toggle {
          border-left: 1px solid var(--surface-border);
        }
      }
    }
  `]
})
export class CycleDetailComponent implements OnInit {
  cycle = signal<Cycle | null>(null);
  cycleIssues = signal<Issue[]>([]);
  viewMode: 'list' | 'board' = 'list';
  private cycleId = '';
  private projectId = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private cyclesService: CyclesService,
    private issuesService: IssuesService,
    private notification: NotificationService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.cycleId = params['id'];
      this.loadCycle();
    });
  }

  loadCycle() {
    this.cyclesService.getById(this.cycleId).subscribe({
      next: (c) => {
        this.cycle.set(c);
        this.cycleIssues.set(c.issues ?? []);
        this.projectId = c.projectId;
      },
    });
  }

  goBack() {
    if (this.projectId) {
      this.router.navigate(['/projects', this.projectId], { queryParams: { tab: 'cycles' } });
    } else {
      this.router.navigate(['/projects']);
    }
  }

  onStatusChange(event: { id: string; status: IssueStatus }) {
    this.issuesService.update(event.id, { status: event.status }).subscribe({
      next: () => {
        if (this.viewMode === 'list') {
          this.loadCycle();
        }
      },
      error: () => this.loadCycle(),
    });
  }

  deleteCycle() {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Cycle', message: 'Are you sure? Issues will be unlinked, not deleted.' },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.cyclesService.delete(this.cycleId).subscribe({
          next: () => { this.notification.success('Cycle deleted'); this.goBack(); },
        });
      }
    });
  }
}
