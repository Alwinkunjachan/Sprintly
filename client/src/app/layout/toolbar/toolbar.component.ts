import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="toolbar">
      <div class="toolbar-left"></div>
      <div class="toolbar-right">
        <a routerLink="/labels" routerLinkActive="active" class="toolbar-btn" matTooltip="Labels">
          <mat-icon>label</mat-icon>
          <span class="btn-text">Labels</span>
        </a>
        <button mat-icon-button (click)="themeService.toggleTheme()" class="theme-btn"
                [matTooltip]="themeService.isDark() ? 'Light mode' : 'Dark mode'">
          <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 44px;
      padding: 0 16px 0 20px;
      border-bottom: 1px solid var(--surface-border);
      background: var(--surface-bg);
      flex-shrink: 0;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 6px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      transition: all 150ms;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--row-hover);
        color: var(--text-primary);
      }

      &.active {
        color: var(--accent-primary);
      }
    }

    .theme-btn {
      width: 32px;
      height: 32px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  `]
})
export class ToolbarComponent {
  constructor(public themeService: ThemeService) {}
}
