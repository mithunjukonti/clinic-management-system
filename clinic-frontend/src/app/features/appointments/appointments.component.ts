
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import {
  Appointment,
  AppointmentPerson,
  AppointmentRequest,
  AppointmentsService
} from './appointments.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.css'
})
export class AppointmentsComponent implements OnInit {
  appointments: Appointment[] = [];
  patients: AppointmentPerson[] = [];
  doctors: AppointmentPerson[] = [];

  searchTerm = '';
  loading = false;
  saving = false;
  showForm = false;

  successMessage = '';
  errorMessage = '';

  form = this.createEmptyForm();

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAppointments();

    if (this.canBook) {
      this.loadBookingOptions();
    }
  }

  get userRole(): string | null {
    return this.authService.getRole();
  }

  get canBook(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'STAFF';
  }

  get isDoctor(): boolean {
    return this.userRole === 'DOCTOR';
  }

  get canCancel(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'STAFF';
  }

  get canComplete(): boolean {
    return this.userRole === 'DOCTOR';
  }

  get filteredAppointments(): Appointment[] {
    const query = this.searchTerm.trim().toLowerCase();

    if (!query) {
      return this.appointments;
    }

    return this.appointments.filter(appointment => {
      const values = [
        appointment.patient?.name,
        appointment.doctor?.name,
        appointment.reason,
        appointment.status,
        appointment.id?.toString()
      ];

      return values.some(value =>
        value?.toLowerCase().includes(query)
      );
    });
  }

  private createEmptyForm(): {
    patientId: number | null;
    doctorId: number | null;
    appointmentDateTime: string;
    reason: string;
  } {
    return {
      patientId: null,
      doctorId: null,
      appointmentDateTime: '',
      reason: ''
    };
  }

  getPatientAge(dateOfBirth?: string): number | null {
    if (!dateOfBirth) {
      return null;
    }

    const birthDate = new Date(
      `${dateOfBirth.slice(0, 10)}T00:00:00`
    );

    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    const today = new Date();

    if (birthDate > today) {
      return null;
    }

    let age = today.getFullYear() - birthDate.getFullYear();

    const birthdayNotReached =
      today.getMonth() < birthDate.getMonth() ||
      (
        today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate()
      );

    if (birthdayNotReached) {
      age--;
    }

    return age;
  }

  loadAppointments(): void {
    this.loading = true;
    this.errorMessage = '';

    this.appointmentsService.getAppointments().subscribe({
      next: appointments => {
        // Newest scheduled appointment first.
        // Copy the array before sorting to avoid mutating the response.
        this.appointments = [...appointments].sort(
          (a, b) =>
            new Date(b.appointmentDateTime).getTime() -
            new Date(a.appointmentDateTime).getTime()
        );

        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load appointments.'
        );
      }
    });
  }

  private loadBookingOptions(): void {
    this.appointmentsService.getPatients().subscribe({
      next: patients => {
        this.patients = patients;
      },
      error: error => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load patients for booking.'
        );
      }
    });

    this.appointmentsService.getDoctors().subscribe({
      next: doctors => {
        this.doctors = doctors;
      },
      error: error => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load doctors for booking.'
        );
      }
    });
  }

  openForm(): void {
    if (!this.canBook) {
      return;
    }

    this.form = this.createEmptyForm();
    this.successMessage = '';
    this.errorMessage = '';
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.form = this.createEmptyForm();
    this.errorMessage = '';
  }

  bookAppointment(): void {
    if (!this.canBook || this.saving) {
      return;
    }

    if (
      this.form.patientId == null ||
      this.form.doctorId == null ||
      !this.form.appointmentDateTime
    ) {
      this.errorMessage =
        'Please select a patient, doctor, date, and time.';
      return;
    }

    const selectedDoctor = this.doctors.find(
      doctor => doctor.id === this.form.doctorId
    );

    if (!selectedDoctor) {
      this.errorMessage = 'Please select a valid doctor.';
      return;
    }

    const selectedPatient = this.patients.find(
      patient => patient.id === this.form.patientId
    );

    if (!selectedPatient) {
      this.errorMessage = 'Please select a valid patient.';
      return;
    }

    const selectedDate = new Date(
      this.form.appointmentDateTime
    );

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.getTime() <= Date.now()
    ) {
      this.errorMessage =
        'Appointment must be scheduled in the future.';
      return;
    }

    const request: AppointmentRequest = {
      patient: { id: this.form.patientId },
      doctor: { id: this.form.doctorId },
      appointmentDateTime: this.form.appointmentDateTime,
      reason: this.form.reason.trim() || null
    };

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.appointmentsService.bookAppointment(request).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.form = this.createEmptyForm();
        this.successMessage =
          'Appointment booked successfully.';
        this.loadAppointments();
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to book the appointment.'
        );
      }
    });
  }

  cancelAppointment(appointment: Appointment): void {
    if (
      !this.canCancel ||
      appointment.id == null ||
      !this.isBooked(appointment)
    ) {
      return;
    }

    if (
      !window.confirm(
        'Are you sure you want to cancel this appointment?'
      )
    ) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.appointmentsService
      .cancelAppointment(appointment.id)
      .subscribe({
        next: () => {
          this.successMessage =
            'Appointment cancelled successfully.';
          this.loadAppointments();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to cancel the appointment.'
          );
        }
      });
  }

  completeAppointment(appointment: Appointment): void {
    if (
      !this.canComplete ||
      appointment.id == null ||
      !this.isBooked(appointment)
    ) {
      return;
    }

    if (
      !window.confirm(
        'Mark this appointment as completed?'
      )
    ) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.appointmentsService
      .completeAppointment(appointment.id)
      .subscribe({
        next: () => {
          this.successMessage =
            'Appointment marked as completed.';
          this.loadAppointments();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to complete the appointment.'
          );
        }
      });
  }

  isBooked(appointment: Appointment): boolean {
    return appointment.status?.toUpperCase() === 'BOOKED';
  }

  private getErrorMessage(
    error: any,
    fallback: string
  ): string {
    if (error.status === 0) {
      return 'Cannot connect to the backend. Check that Spring Boot is running and CORS is configured.';
    }

    if (error.status === 401) {
      return 'Your session is not authorized. Please log in again.';
    }

    if (error.status === 403) {
      return 'Your account does not have permission to perform this action.';
    }

    if (error.status === 400 && error.error?.message) {
      return error.error.message;
    }

    return error.error?.message || fallback;
  }
}
