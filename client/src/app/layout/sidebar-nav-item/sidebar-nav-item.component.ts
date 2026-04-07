import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar-nav-item',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <a [routerLink]="route"
       routerLinkActive="active"
       [routerLinkActiveOptions]="{ exact: exact }"
       class="nav-item"
       [class.collapsed]="collapsed"
       [class.force-active]="forceActive"
       [title]="label">
      <mat-icon class="nav-icon">{{ icon }}</mat-icon>
      @if (!collapsed) {
        <span class="nav-label">{{ label }}</span>
      }
    </a>
  `,
  styles: [`
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      margin: 1px 8px;
      border-radius: 6px;
      color: var(--sidebar-text);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 150ms ease;
      cursor: pointer;
      min-height: 32px;

      &:hover {
        background: var(--sidebar-hover);
        color: var(--sidebar-text-active);
      }

      &.active, &.force-active {
        background: var(--sidebar-hover);
        color: var(--sidebar-text-active);
      }

      &.collapsed {
        justify-content: center;
        padding: 6px;
        margin: 1px 4px;
      }
    }

    .nav-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0.7;
    }

    .active .nav-icon, .force-active .nav-icon {
      opacity: 1;
    }

    .nav-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class SidebarNavItemComponent {
  @Input() icon = '';
  @Input() label = '';
  @Input() route = '';
  @Input() collapsed = false;
  @Input() exact = false;
  @Input() forceActive = false;
}
