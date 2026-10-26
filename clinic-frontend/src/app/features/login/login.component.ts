
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  onLogin(): void {
    if (this.loading) {
      return;
    }

    const username = this.username.trim();

    if (!username || !this.password) {
      this.errorMessage = 'Enter your username and password.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(username, this.password).subscribe({
      next: user => {
        this.loading = false;

        const role = user.role
          .replace(/^ROLE_/, '')
          .toUpperCase();

        switch (role) {
          case 'ADMIN':
            void this.router.navigate(['/admin-dashboard']);
            break;

          case 'DOCTOR':
            void this.router.navigate(['/doctor-dashboard']);
            break;

          case 'STAFF':
            void this.router.navigate(['/staff-dashboard']);
            break;

          default:
            this.authService.logout();
            this.errorMessage =
              `The account role "${user.role}" is not supported.`;
        }
      },
      error: error => {
        this.loading = false;
        this.authService.logout();

        if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'Invalid username or password.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Cannot connect to the backend. Check that Spring Boot is running.';
        } else {
          this.errorMessage =
            'Login failed. Check the backend response and try again.';
        }
      }
    });
  }
}
