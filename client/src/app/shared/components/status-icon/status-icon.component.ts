import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IssueStatus } from '../../../core/models/issue.model';

@Component({
  selector: 'app-status-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 16 16" fill="none">
      @switch (status) {
        @case ('backlog') {
          <circle cx="8" cy="8" r="6.5" stroke="var(--status-backlog)" stroke-width="1.5" stroke-dasharray="3 2"/>
        }
        @case ('todo') {
          <circle cx="8" cy="8" r="6.5" stroke="var(--status-todo)" stroke-width="1.5"/>
        }
        @case ('in_progress') {
          <circle cx="8" cy="8" r="6.5" stroke="var(--status-in-progress)" stroke-width="1.5"/>
          <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5" fill="var(--status-in-progress)" opacity="0.3"/>
        }
        @case ('ready_to_test') {
          <circle cx="8" cy="8" r="6.5" stroke="var(--status-ready-to-test)" stroke-width="1.5"/>
          <path d="M8 1.5 A6.5 6.5 0 0 1 14.5 8 A6.5 6.5 0 0 1 8 14.5" fill="var(--status-ready-to-test)" opacity="0.3"/>
        }
        @case ('testing_in_progress') {
          <circle cx="8" cy="8" r="6.5" stroke="var(--status-testing)" stroke-width="1.5"/>
          <path d="M8 1.5 A6.5 6.5 0 0 1 14.5 8 A6.5 6.5 0 0 1 8 14.5 A6.5 6.5 0 0 1 1.5 8" fill="var(--status-testing)" opacity="0.3"/>
        }
        @case ('done') {
          <circle cx="8" cy="8" r="7" fill="var(--status-done)"/>
          <path d="M5 8L7 10L11 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @case ('cancelled') {
          <circle cx="8" cy="8" r="6.5" stroke="var(--status-cancelled)" stroke-width="1.5"/>
          <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="var(--status-cancelled)" stroke-width="1.5" stroke-linecap="round"/>
        }
      }
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class StatusIconComponent {
  @Input() status: IssueStatus = 'backlog';
  @Input() size = 16;
}
