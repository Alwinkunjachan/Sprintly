import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IssuePriority } from '../../../core/models/issue.model';

@Component({
  selector: 'app-priority-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 16 16" fill="none">
      @switch (priority) {
        @case ('urgent') {
          <rect x="1" y="8" width="3" height="6" rx="0.5" fill="var(--priority-urgent)"/>
          <rect x="6.5" y="4" width="3" height="10" rx="0.5" fill="var(--priority-urgent)"/>
          <rect x="12" y="1" width="3" height="13" rx="0.5" fill="var(--priority-urgent)"/>
        }
        @case ('high') {
          <rect x="1" y="8" width="3" height="6" rx="0.5" fill="var(--priority-high)"/>
          <rect x="6.5" y="4" width="3" height="10" rx="0.5" fill="var(--priority-high)"/>
          <rect x="12" y="1" width="3" height="13" rx="0.5" fill="var(--priority-high)" opacity="0.3"/>
        }
        @case ('medium') {
          <rect x="1" y="8" width="3" height="6" rx="0.5" fill="var(--priority-medium)"/>
          <rect x="6.5" y="4" width="3" height="10" rx="0.5" fill="var(--priority-medium)" opacity="0.3"/>
          <rect x="12" y="1" width="3" height="13" rx="0.5" fill="var(--priority-medium)" opacity="0.3"/>
        }
        @case ('low') {
          <rect x="1" y="8" width="3" height="6" rx="0.5" fill="var(--priority-low)"/>
          <rect x="6.5" y="4" width="3" height="10" rx="0.5" fill="var(--priority-low)" opacity="0.3"/>
          <rect x="12" y="1" width="3" height="13" rx="0.5" fill="var(--priority-low)" opacity="0.3"/>
        }
        @case ('none') {
          <line x1="2" y1="8" x2="14" y2="8" stroke="var(--priority-none)" stroke-width="2" stroke-linecap="round"/>
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
export class PriorityIconComponent {
  @Input() priority: IssuePriority = 'none';
  @Input() size = 16;
}
