import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { StatusIconComponent } from '../../../shared/components/status-icon/status-icon.component';
import { PriorityIconComponent } from '../../../shared/components/priority-icon/priority-icon.component';
import { LabelBadgeComponent } from '../../../shared/components/label-badge/label-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { Issue, IssueStatus, ISSUE_STATUSES } from '../../../core/models/issue.model';

@Component({
  selector: 'app-issue-row',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatIconModule, MatMenuModule,
    StatusIconComponent, PriorityIconComponent, LabelBadgeComponent, RelativeTimePipe,
  ],
  template: `
    <div class="issue-row">
      <div class="row-left">
        <button class="status-btn" [matMenuTriggerFor]="statusMenu" (click)="$event.stopPropagation()">
          <app-status-icon [status]="issue.status" />
        </button>
        <mat-menu #statusMenu="matMenu">
          @for (s of statuses; track s.value) {
            <button mat-menu-item (click)="onStatusChange(s.value)">
              <app-status-icon [status]="s.value" />
              <span style="margin-left: 8px">{{ s.label }}</span>
            </button>
          }
        </mat-menu>

        <span class="issue-identifier">{{ issue.identifier }}</span>
        <a class="issue-title" [routerLink]="['/issues', issue.id]">{{ issue.title }}</a>
      </div>

      <div class="row-right">
        @for (label of issue.labels; track label.id) {
          <app-label-badge [name]="label.name" [color]="label.color" />
        }
        <app-priority-icon [priority]="issue.priority" />
        @if (issue.assignee) {
          <div class="assignee-avatar" [title]="issue.assignee.name">
            {{ issue.assignee.name.charAt(0) }}
          </div>
        }
        <span class="issue-date">{{ issue.createdAt | relativeTime }}</span>
      </div>
    </div>
  `,
  styles: [`
    .issue-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 20px;
      border-bottom: 1px solid var(--surface-border);
      transition: background 100ms ease;

      &:hover {
        background: var(--row-hover);
      }
    }

    .row-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .status-btn {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;

      &:hover {
        background: var(--surface-border);
      }
    }

    .issue-identifier {
      font-size: 12px;
      color: var(--text-tertiary);
      font-weight: 500;
      white-space: nowrap;
      min-width: 60px;
    }

    .issue-title {
      font-size: 13px;
      color: var(--text-primary);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &:hover {
        color: var(--accent-primary);
      }
    }

    .row-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      margin-left: 16px;
    }

    .assignee-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--accent-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
    }

    .issue-date {
      font-size: 12px;
      color: var(--text-tertiary);
      white-space: nowrap;
      min-width: 50px;
      text-align: right;
    }
  `]
})
export class IssueRowComponent {
  @Input() issue!: Issue;
  @Output() statusChange = new EventEmitter<{ id: string; status: IssueStatus }>();

  statuses = ISSUE_STATUSES;

  onStatusChange(status: IssueStatus) {
    this.statusChange.emit({ id: this.issue.id, status });
  }
}
