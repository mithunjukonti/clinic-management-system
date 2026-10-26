
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { Appointment, AppointmentsService } from '../../appointments/appointments.service';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './doctor-dashboard.component.html',
  styleUrl: './doctor-dashboard.component.css'
})
export class DoctorDashboardComponent implements OnInit {
  totalAppointments = 0;
  bookedAppointments = 0;
  completedAppointments = 0;

  loadingStats = false;
  statsError = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly appointmentsService: AppointmentsService
  ) {}

  ngOnInit(): void {
    this.loadAppointmentStats();
  }

  get username(): string {
    return this.authService.getCurrentUser()?.username ?? 'Doctor';
  }

  loadAppointmentStats(): void {
    if (this.loadingStats) {
      return;
    }

    this.loadingStats = true;
    this.statsError = '';

    this.appointmentsService.getAppointments().subscribe({
      next: (appointments: Appointment[]) => {
        this.totalAppointments = appointments.length;

        this.bookedAppointments = appointments.filter(
          appointment =>
            appointment.status?.toUpperCase() === 'BOOKED'
        ).length;

        this.completedAppointments = appointments.filter(
          appointment =>
            appointment.status?.toUpperCase() === 'COMPLETED'
        ).length;

        this.loadingStats = false;
      },
      error: (error) => {
        this.loadingStats = false;
        this.statsError =
          error.status === 401
            ? 'Your session has expired. Please log in again.'
            : error.status === 403
              ? 'You are not authorized to view appointment statistics.'
              : 'Unable to load appointment statistics. Please try again.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
