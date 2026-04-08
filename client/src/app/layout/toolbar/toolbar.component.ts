import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
  ],
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

        @if (authService.currentMember(); as member) {
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
            @if (member.avatarUrl) {
              <img [src]="member.avatarUrl" class="user-avatar" alt="avatar" />
            } @else {
              <div class="user-avatar-placeholder">{{ authService.memberInitial() }}</div>
            }
            <span class="user-name">{{ member.name }}</span>
            <mat-icon class="dropdown-icon">arrow_drop_down</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu" xPosition="before">
            <div class="user-email-item" mat-menu-item disabled>{{ member.email }}</div>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="authService.logout()">
              <mat-icon>logout</mat-icon>
              <span>Sign out</span>
            </button>
          </mat-menu>
        }
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

    .user-menu-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 500;
      min-width: auto;
      line-height: 1;
    }

    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }

    .user-avatar-placeholder {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--accent-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }

    .user-name {
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-secondary);
    }

    .user-email-item {
      font-size: 12px;
      color: var(--text-secondary);
      opacity: 0.8;
    }
  `]
})
export class ToolbarComponent {
  constructor(
    public themeService: ThemeService,
    public authService: AuthService
  ) {}
}
