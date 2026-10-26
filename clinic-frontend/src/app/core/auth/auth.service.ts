
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  doctor: unknown | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api/users';
  private readonly credentialsKey = 'clinicCredentials';
  private readonly userKey = 'clinicUser';

  private credentials: string | null = this.readCredentials();
  private currentUser: AuthUser | null = this.readUser();

  constructor(private readonly http: HttpClient) {}

  private readCredentials(): string | null {
    try {
      return sessionStorage.getItem(this.credentialsKey);
    } catch {
      return null;
    }
  }

  private readUser(): AuthUser | null {
    try {
      const value = sessionStorage.getItem(this.userKey);

      if (!value) {
        return null;
      }

      const user = JSON.parse(value) as AuthUser;

      if (
        typeof user.username !== 'string' ||
        typeof user.role !== 'string'
      ) {
        sessionStorage.removeItem(this.userKey);
        return null;
      }

      return user;
    } catch {
      return null;
    }
  }

  login(username: string, password: string): Observable<AuthUser> {
    const encodedCredentials = btoa(`${username}:${password}`);

    const headers = new HttpHeaders({
      Authorization: `Basic ${encodedCredentials}`
    });

    return this.http
      .get<AuthUser>(`${this.apiUrl}/me`, { headers })
      .pipe(
        tap(user => {
          if (!user || !user.username || !user.role) {
            throw new Error('The server returned an invalid user response.');
          }

          this.credentials = encodedCredentials;
          this.currentUser = user;

          sessionStorage.setItem(
            this.credentialsKey,
            encodedCredentials
          );
          sessionStorage.setItem(
            this.userKey,
            JSON.stringify(user)
          );
        })
      );
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getCredentials(): string | null {
    return this.credentials;
  }

  getRole(): string | null {
    const role = this.currentUser?.role;

    if (!role) {
      return null;
    }

    return role.replace(/^ROLE_/, '').toUpperCase();
  }

  isLoggedIn(): boolean {
    return Boolean(this.credentials && this.currentUser);
  }

  logout(): void {
    this.credentials = null;
    this.currentUser = null;

    try {
      sessionStorage.removeItem(this.credentialsKey);
      sessionStorage.removeItem(this.userKey);
    } catch {
      // Authentication state is also cleared from memory.
    }
  }
}
