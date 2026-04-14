import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StatusIconComponent } from '../../../shared/components/status-icon/status-icon.component';
import { PriorityIconComponent } from '../../../shared/components/priority-icon/priority-icon.component';
import { LabelBadgeComponent } from '../../../shared/components/label-badge/label-badge.component';
import { Issue, IssueStatus, ISSUE_STATUSES } from '../../../core/models/issue.model';

@Component({
  selector: 'app-issue-board',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    StatusIconComponent, PriorityIconComponent, LabelBadgeComponent,
  ],
  template: `
    <div class="board-container">
      <div class="board-columns">
        @for (col of columnsData(); track col.status) {
          <div class="board-column">
            <div class="column-header">
              <app-status-icon [status]="col.status" [size]="14" />
              <span class="column-title">{{ col.label }}</span>
              <span class="column-count">{{ col.issues.length }}</span>
            </div>

            <div
              class="column-body"
              [class.drag-over]="dragOverStatus === col.status"
              (dragover)="onDragOver($event, col.status)"
              (dragleave)="onDragLeave($event)"
              (drop)="onColumnDrop($event, col.status)">

              @for (issue of col.issues; track issue.id) {
                <div
                  class="board-card"
                  draggable="true"
                  [class.dragging]="draggedIssue?.id === issue.id"
                  (dragstart)="onDragStart($event, issue)"
                  (dragend)="onDragEnd()">
                  <div class="card-header">
                    <span class="card-identifier">{{ issue.identifier }}</span>
                    <app-priority-icon [priority]="issue.priority" [size]="14" />
                  </div>
                  <a class="card-title" [routerLink]="['/issues', issue.id]" (click)="$event.stopPropagation()">{{ issue.title }}</a>
                  <div class="card-footer">
                    <div class="card-labels">
                      @for (label of issue.labels; track label.id) {
                        <app-label-badge [name]="label.name" [color]="label.color" />
                      }
                    </div>
                    @if (issue.assignee) {
                      <div class="card-assignee" [title]="issue.assignee.name">
                        {{ issue.assignee.name.charAt(0) }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .board-container {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0 20px 16px;
    }

    .board-columns {
      display: flex;
      gap: 12px;
      height: 100%;
      min-width: min-content;
    }

    .board-column {
      display: flex;
      flex-direction: column;
      width: 280px;
      min-width: 280px;
      background: var(--surface-raised);
      border-radius: 8px;
      border: 1px solid var(--surface-border);
    }

    .column-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }

    .column-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .column-count {
      font-size: 12px;
      color: var(--text-tertiary);
      margin-left: auto;
    }

    .column-body {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 60px;
      border-radius: 0 0 8px 8px;
      transition: background 150ms ease;

      &.drag-over {
        background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
        border: 1px dashed var(--accent-primary);
        border-top: none;
        margin: 0 -1px -1px;
        padding: 8px 7px 7px;
      }
    }

    .board-card {
      background: var(--surface-bg);
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      padding: 10px 12px;
      cursor: grab;
      transition: border-color 150ms ease, opacity 150ms ease;

      &:hover {
        border-color: var(--text-tertiary);
      }

      &:active {
        cursor: grabbing;
      }

      &.dragging {
        opacity: 0.3;
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .card-identifier {
      font-size: 11px;
      color: var(--text-tertiary);
      font-weight: 500;
    }

    .card-title {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 13px;
      color: var(--text-primary);
      text-decoration: none;
      line-height: 1.4;

      &:hover {
        color: var(--accent-primary);
      }
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;
      gap: 8px;
    }

    .card-labels {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      min-width: 0;
      overflow: hidden;
    }

    .card-assignee {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      flex-shrink: 0;
    }
  `]
})
export class IssueBoardComponent {
  @Input() issues = signal<Issue[]>([]);
  @Output() statusChange = new EventEmitter<{ id: string; status: IssueStatus }>();

  draggedIssue: Issue | null = null;
  dragOverStatus: IssueStatus | null = null;

  columnsData = computed(() => {
    const issues = this.issues();
    return ISSUE_STATUSES.map(s => ({
      status: s.value,
      label: s.label,
      issues: issues.filter(i => i.status === s.value),
    }));
  });

  onDragStart(event: DragEvent, issue: Issue) {
    this.draggedIssue = issue;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', issue.id);
  }

  onDragOver(event: DragEvent, status: IssueStatus) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverStatus = status;
  }

  onDragLeave(event: DragEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      this.dragOverStatus = null;
    }
  }

  onDragEnd() {
    this.draggedIssue = null;
    this.dragOverStatus = null;
  }

  onColumnDrop(event: DragEvent, newStatus: IssueStatus) {
    event.preventDefault();
    this.dragOverStatus = null;

    if (!this.draggedIssue || this.draggedIssue.status === newStatus) {
      this.draggedIssue = null;
      return;
    }

    const issueId = this.draggedIssue.id;

    // Optimistic update — move card to new column immediately
    const updated = this.issues().map(i =>
      i.id === issueId ? { ...i, status: newStatus } : i
    );
    this.issues.set(updated);

    this.statusChange.emit({ id: issueId, status: newStatus });
    this.draggedIssue = null;
  }
}
