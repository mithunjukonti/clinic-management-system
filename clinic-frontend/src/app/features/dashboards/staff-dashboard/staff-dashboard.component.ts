
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './staff-dashboard.component.html',
  styleUrl: './staff-dashboard.component.css'
})
export class StaffDashboardComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  get username(): string {
    return this.authService.getCurrentUser()?.username ?? 'Clinic Staff';
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
