import { Injectable, signal, computed } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSignal = signal<Theme>(this.getStoredTheme());

  readonly currentTheme = this.themeSignal.asReadonly();
  readonly isDark = computed(() => this.themeSignal() === 'dark');

  constructor() {
    this.applyTheme(this.themeSignal());
  }

  toggleTheme(): void {
    const next: Theme = this.themeSignal() === 'dark' ? 'light' : 'dark';
    this.themeSignal.set(next);
    this.applyTheme(next);
    localStorage.setItem('theme', next);
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
  }

  private getStoredTheme(): Theme {
    return (localStorage.getItem('theme') as Theme) || 'dark';
  }
}
