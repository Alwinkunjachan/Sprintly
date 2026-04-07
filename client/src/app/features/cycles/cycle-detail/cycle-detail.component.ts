import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { IssueRowComponent } from '../../issues/issue-row/issue-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CyclesService } from '../services/cycles.service';
import { IssuesService } from '../../issues/services/issues.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Cycle } from '../../../core/models/cycle.model';
import { IssueStatus } from '../../../core/models/issue.model';

@Component({
  selector: 'app-cycle-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, IssueRowComponent, EmptyStateComponent],
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
          <button mat-icon-button color="warn" (click)="deleteCycle()">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>

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
    h1 { font-size: 18px; font-weight: 600; margin: 0; color: var(--text-primary); }
    .cycle-meta { font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; gap: 8px; }
    .cycle-status {
      font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 10px; text-transform: capitalize;
    }
    .status-upcoming { background: var(--surface-border); color: var(--text-secondary); }
    .status-active { background: #f5a62320; color: #f5a623; }
    .status-completed { background: #4caf5020; color: #4caf50; }
    .issue-list { flex: 1; overflow: auto; }
  `]
})
export class CycleDetailComponent implements OnInit {
  cycle = signal<Cycle | null>(null);
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
      next: () => this.loadCycle(),
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
