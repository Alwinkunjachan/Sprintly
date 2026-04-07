import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-label-badge',
  standalone: true,
  template: `
    <span class="badge" [style.background-color]="color + '20'" [style.color]="color" [style.border-color]="color + '40'">
      {{ name }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 1px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid;
      white-space: nowrap;
    }
  `]
})
export class LabelBadgeComponent {
  @Input() name = '';
  @Input() color = '#666';
}
