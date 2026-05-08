import { Injectable, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _kc: Keycloak;

  readonly isAuthenticated = signal(false);
  readonly username = signal<string | null>(null);
  readonly userRoles = signal<string[]>([]);
  readonly initFailed = signal(false);

  constructor() {
    this._kc = new Keycloak({
      url: 'http://localhost:8180',
      realm: 'qui-est-ce',
      clientId: 'qui-est-ce-front',
    });
  }

  init(): Promise<boolean> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('auth timeout')), 5000),
    );
    return Promise.race([
      this._kc.init({ onLoad: 'login-required', pkceMethod: 'S256' }),
      timeout,
    ])
      .then(authenticated => {
        if (authenticated) this._syncState();
        return authenticated;
      })
      .catch(() => {
        this.initFailed.set(true);
        return false;
      });
  }

  async getValidToken(): Promise<string> {
    await this._kc.updateToken(30);
    return this._kc.token!;
  }

  hasRole(role: string): boolean {
    return this._kc.hasRealmRole(role);
  }

  logout(): void {
    this._kc.logout({ redirectUri: window.location.origin });
  }

  private _syncState(): void {
    this.isAuthenticated.set(true);
    this.username.set(this._kc.tokenParsed?.['preferred_username'] ?? null);
    this.userRoles.set(this._kc.realmAccess?.roles ?? []);
  }
}
