
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  get username(): string {
    return this.authService.getCurrentUser()?.username ?? 'Administrator';
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
