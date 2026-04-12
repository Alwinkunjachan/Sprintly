import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of } from 'rxjs';
import { Member } from '../models/member.model';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenResponse,
} from '../models/auth.model';
import { environment } from '../../../environments/environment';

const API_URL = `${environment.apiUrl}/auth`;
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentMemberSignal = signal<Member | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(true);

  /** Resolves when the initial auth check is complete */
  readonly authReady: Promise<void>;

  readonly currentMember = this.currentMemberSignal.asReadonly();
  readonly isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly memberInitial = computed(() => {
    const member = this.currentMemberSignal();
    return member ? member.name.charAt(0).toUpperCase() : '';
  });
  readonly isAdmin = computed(() => {
    const member = this.currentMemberSignal();
    return member?.role === 'admin';
  });

  constructor(private http: HttpClient, private router: Router) {
    this.authReady = this.loadStoredAuth();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/login`, credentials).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/register`, data).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  refreshToken(): Observable<TokenResponse> {
    const token = this.getRefreshToken();
    if (!token) {
      return of({ accessToken: '', refreshToken: '' });
    }
    return this.http
      .post<TokenResponse>(`${API_URL}/refresh`, { refreshToken: token })
      .pipe(
        tap((tokens) => this.storeTokens(tokens.accessToken, tokens.refreshToken))
      );
  }

  getProfile(): Observable<Member> {
    return this.http.get<Member>(`${API_URL}/me`);
  }

  googleLogin(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  handleGoogleCallback(accessToken: string, refreshToken: string): void {
    this.storeTokens(accessToken, refreshToken);
    this.isAuthenticatedSignal.set(true);
    this.getProfile().subscribe({
      next: (member) => {
        this.currentMemberSignal.set(member);
        this.router.navigate(['/']);
      },
      error: () => {
        this.logout();
      },
    });
  }

  logout(): void {
    this.clearTokens();
    this.currentMemberSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.storeTokens(response.accessToken, response.refreshToken);
    this.currentMemberSignal.set(response.member);
    this.isAuthenticatedSignal.set(true);
  }

  /**
   * On startup, try to restore auth from stored tokens.
   * Makes direct HTTP calls with explicit headers to avoid interceptor loops.
   */
  private async loadStoredAuth(): Promise<void> {
    let accessToken = this.getAccessToken();
    const refreshTokenVal = this.getRefreshToken();

    if (!accessToken) {
      this.isLoadingSignal.set(false);
      return;
    }

    this.isAuthenticatedSignal.set(true);

    try {
      // Try fetching profile with current access token (direct call, no interceptor issues)
      let member = await this.fetchProfileDirect(accessToken);

      if (!member && refreshTokenVal) {
        // Access token expired — try refresh
        const tokens = await fetch(`${API_URL}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenVal }),
        });

        if (tokens.ok) {
          const data = await tokens.json();
          this.storeTokens(data.accessToken, data.refreshToken);
          accessToken = data.accessToken;
          member = await this.fetchProfileDirect(accessToken!);
        }
      }

      if (member) {
        this.currentMemberSignal.set(member);
      } else {
        // Both tokens invalid
        this.clearTokens();
        this.isAuthenticatedSignal.set(false);
      }
    } catch {
      this.clearTokens();
      this.currentMemberSignal.set(null);
      this.isAuthenticatedSignal.set(false);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /** Fetch profile using native fetch to bypass Angular interceptor completely */
  private async fetchProfileDirect(token: string): Promise<Member | null> {
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}
