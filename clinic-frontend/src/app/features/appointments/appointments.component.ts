import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

import {
  Appointment,
  AppointmentPerson,
  AppointmentRequest,
  CompleteAppointmentRequest,
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
  completing = false;

  showForm = false;
  showCompletionForm = false;

  selectedAppointment: Appointment | null = null;

  successMessage = '';
  errorMessage = '';

  form = this.createEmptyForm();

  consultationForm = this.createEmptyConsultationForm();

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
    return this.isDoctor;
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

  private createEmptyConsultationForm(): {
    symptoms: string;
    diagnosis: string;
    treatment: string;
    prescription: string;
    followUpDate: string;
  } {
    return {
      symptoms: '',
      diagnosis: '',
      treatment: '',
      prescription: '',
      followUpDate: ''
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

    const selectedDate = new Date(this.form.appointmentDateTime);

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
        this.successMessage = 'Appointment booked successfully.';
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

  // Open the consultation form instead of directly completing the visit.
  completeAppointment(appointment: Appointment): void {
    if (
      !this.canComplete ||
      appointment.id == null ||
      appointment.patient?.id == null ||
      !this.isBooked(appointment)
    ) {
      return;
    }

    this.selectedAppointment = appointment;
    this.consultationForm = this.createEmptyConsultationForm();

    this.showCompletionForm = true;
    this.showForm = false;
    this.errorMessage = '';
    this.successMessage = '';

    setTimeout(() => {
      document.querySelector('.consultation-form-card')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }, 0);
  }

  cancelCompletionForm(): void {
    if (this.completing) {
      return;
    }

    this.showCompletionForm = false;
    this.selectedAppointment = null;
    this.consultationForm = this.createEmptyConsultationForm();
    this.errorMessage = '';
  }

  saveConsultation(): void {
    const appointment = this.selectedAppointment;

    if (
      !this.canComplete ||
      !appointment?.id ||
      !appointment.patient?.id ||
      !appointment.appointmentDateTime ||
      this.completing
    ) {
      this.errorMessage =
        'The selected appointment is missing required information.';
      return;
    }

    const symptoms = this.consultationForm.symptoms.trim();
    const diagnosis = this.consultationForm.diagnosis.trim();
    const treatment = this.consultationForm.treatment.trim();
    const prescription = this.consultationForm.prescription.trim();
    const followUpDate = this.consultationForm.followUpDate;

    if (!symptoms || !diagnosis || !treatment) {
      this.errorMessage =
        'Symptoms, diagnosis, and treatment are required.';
      return;
    }

    const visitDate = appointment.appointmentDateTime.substring(0, 10);

    if (followUpDate && followUpDate < visitDate) {
      this.errorMessage =
        'Follow-up date cannot be earlier than the visit date.';
      return;
    }

    const request: CompleteAppointmentRequest = {
      patient: {
        id: appointment.patient.id
      },
      appointment: {
        id: appointment.id
      },
      symptoms,
      diagnosis,
      treatment,
      prescription,
      visitDate,
      ...(followUpDate ? { followUpDate } : {})
    };

    this.completing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.appointmentsService
      .completeAppointmentWithRecord(appointment.id, request)
      .subscribe({
        next: () => {
          this.completing = false;
          this.showCompletionForm = false;
          this.selectedAppointment = null;
          this.consultationForm = this.createEmptyConsultationForm();

          this.successMessage =
            'Medical record saved and appointment completed successfully.';

          this.loadAppointments();
        },
        error: error => {
          console.error(
            'Failed to save medical record and complete appointment:',
            error
          );

          this.completing = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to save the medical record and complete the appointment.'
          );
        }
      });
  }

  isBooked(appointment: Appointment): boolean {
    return appointment.status?.toUpperCase() === 'BOOKED';
  }

  private getErrorMessage(error: any, fallback: string): string {
    if (error.status === 0) {
      return 'Cannot connect to the backend. Check that Spring Boot is running and CORS is configured.';
    }

    if (error.status === 401) {
      return 'Your session is not authorized. Please log in again.';
    }

    if (error.status === 403) {
      return 'Your account does not have permission to perform this action.';
    }

    if (error.status === 409) {
      return error.error?.message ||
        error.error ||
        'This appointment cannot be completed in its current state.';
    }

    if (error.status === 400) {
      return error.error?.message ||
        'The submitted consultation details are invalid.';
    }

    return error.error?.message || fallback;
  }
}