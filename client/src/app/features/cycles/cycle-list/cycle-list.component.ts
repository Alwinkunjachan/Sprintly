import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CycleCreateDialogComponent } from '../cycle-create-dialog/cycle-create-dialog.component';
import { CyclesService } from '../services/cycles.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Cycle } from '../../../core/models/cycle.model';

@Component({
  selector: 'app-cycle-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatChipsModule, EmptyStateComponent],
  template: `
    <div class="cycle-list-page">
      <div class="page-header">
        <h1>Cycles</h1>
        <button mat-flat-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          New Cycle
        </button>
      </div>

      <div class="cycle-list">
        @for (cycle of cycles(); track cycle.id) {
          <a [routerLink]="['/cycles', cycle.id]" class="cycle-card">
            <div class="cycle-header">
              <mat-icon class="cycle-icon">replay</mat-icon>
              <span class="cycle-name">{{ cycle.name }}</span>
              <span class="cycle-status" [class]="'status-' + cycle.status">{{ cycle.status }}</span>
            </div>
            <div class="cycle-dates">
              {{ cycle.startDate }} &mdash; {{ cycle.endDate }}
            </div>
            @if (cycle.project) {
              <div class="cycle-project">{{ cycle.project.identifier }} - {{ cycle.project.name }}</div>
            }
          </a>
        } @empty {
          <app-empty-state
            icon="replay"
            title="No cycles yet"
            description="Create a cycle to organize your issues into sprints." />
        }
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      h1 { font-size: 18px; font-weight: 600; margin: 0; color: var(--text-primary); }
    }
    .cycle-list { padding: 0 20px; display: flex; flex-direction: column; gap: 8px; }
    .cycle-card {
      display: block; padding: 14px 16px;
      background: var(--surface-raised); border: 1px solid var(--surface-border);
      border-radius: 8px; text-decoration: none;
      transition: all 150ms ease;
      &:hover { border-color: var(--accent-primary); background: var(--row-hover); }
    }
    .cycle-header { display: flex; align-items: center; gap: 8px; }
    .cycle-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); }
    .cycle-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .cycle-status {
      font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 10px;
      text-transform: capitalize;
    }
    .status-upcoming { background: var(--surface-border); color: var(--text-secondary); }
    .status-active { background: #f5a62320; color: #f5a623; }
    .status-completed { background: #4caf5020; color: #4caf50; }
    .cycle-dates { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }
    .cycle-project { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
  `]
})
export class CycleListComponent implements OnInit {
  cycles = signal<Cycle[]>([]);

  constructor(
    private cyclesService: CyclesService,
    private notification: NotificationService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() { this.loadCycles(); }

  loadCycles() {
    this.cyclesService.getAll().subscribe({
      next: (cycles) => this.cycles.set(cycles),
      error: () => this.notification.error('Failed to load cycles'),
    });
  }

  openCreateDialog() {
    const ref = this.dialog.open(CycleCreateDialogComponent, { width: '700px' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.cyclesService.create(result).subscribe({
          next: () => { this.notification.success('Cycle created'); this.loadCycles(); },
          error: () => this.notification.error('Failed to create cycle'),
        });
      }
    });
  }
}
