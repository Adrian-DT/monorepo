import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authenticated = signal(sessionStorage.getItem('yko-authenticated') === 'true');

  isAuthenticated(): boolean {
    return this.authenticated();
  }

  login(username: string, password: string): boolean {
    const validCredentials = username.trim() === 'admin' && password === 'admin';

    this.authenticated.set(validCredentials);

    if (validCredentials) {
      sessionStorage.setItem('yko-authenticated', 'true');
    }

    return validCredentials;
  }

  logout(): void {
    this.authenticated.set(false);
    sessionStorage.removeItem('yko-authenticated');
  }
}
