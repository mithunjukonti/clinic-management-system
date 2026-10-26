
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { Doctor, DoctorsService } from './doctors.service';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctors.component.html',
  styleUrl: './doctors.component.css'
})
export class DoctorsComponent implements OnInit {
  doctors: Doctor[] = [];
  searchTerm = '';

  loading = false;
  saving = false;
  showForm = false;
  editingDoctorId: number | null = null;

  successMessage = '';
  errorMessage = '';

  form: Doctor = this.createEmptyDoctor();

  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
  }

  get userRole(): string | null {
    return this.authService.getRole();
  }

  get canManageDoctors(): boolean {
    return this.userRole === 'ADMIN';
  }

  get isDoctor(): boolean {
    return this.userRole === 'DOCTOR';
  }

  get isEditing(): boolean {
    return this.editingDoctorId !== null;
  }

  private createEmptyDoctor(): Doctor {
    return {
      name: '',
      specialization: '',
      phone: '',
      email: '',
      available: true
    };
  }

  get filteredDoctors(): Doctor[] {
    const query = this.searchTerm.trim().toLowerCase();

    if (!query) {
      return this.doctors;
    }

    return this.doctors.filter(doctor =>
      [
        doctor.name,
        doctor.specialization,
        doctor.phone,
        doctor.email
      ].some(value => value?.toLowerCase().includes(query))
    );
  }

  loadDoctors(): void {
    this.loading = true;
    this.errorMessage = '';

    this.doctorsService.getDoctors().subscribe({
      next: doctors => {
        this.doctors = doctors;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load doctors.'
        );
      }
    });
  }

  openForm(): void {
    if (!this.canManageDoctors) {
      return;
    }

    this.form = this.createEmptyDoctor();
    this.editingDoctorId = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.showForm = true;
  }

  editDoctor(doctor: Doctor): void {
    if (!this.canManageDoctors) {
      return;
    }

    if (doctor.id == null) {
      this.errorMessage = 'Cannot edit this doctor because the ID is missing.';
      return;
    }

    this.form = {
      id: doctor.id,
      name: doctor.name ?? '',
      specialization: doctor.specialization ?? '',
      phone: doctor.phone ?? '',
      email: doctor.email ?? '',
      available: doctor.available ?? true
    };

    this.editingDoctorId = doctor.id;
    this.successMessage = '';
    this.errorMessage = '';
    this.showForm = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingDoctorId = null;
    this.form = this.createEmptyDoctor();
    this.errorMessage = '';
  }

  saveDoctor(): void {
    if (!this.canManageDoctors || this.saving) {
      return;
    }

    const doctor: Doctor = {
      name: this.form.name.trim(),
      specialization: this.form.specialization.trim(),
      phone: this.form.phone.trim(),
      email: this.form.email.trim(),
      available: this.form.available
    };

    if (!doctor.name || !doctor.specialization || !doctor.phone) {
      this.errorMessage =
        'Doctor name, specialization, and phone are required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editingDoctorId !== null) {
      this.updateExistingDoctor(this.editingDoctorId, doctor);
    } else {
      this.registerDoctor(doctor);
    }
  }

  private registerDoctor(doctor: Doctor): void {
    this.doctorsService.createDoctor(doctor).subscribe({
      next: createdDoctor => {
        this.saving = false;
        this.showForm = false;
        this.editingDoctorId = null;
        this.form = this.createEmptyDoctor();
        this.successMessage = 'Doctor added successfully.';
        this.loadDoctors();
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to add the doctor.'
        );
      }
    });
  }

  private updateExistingDoctor(id: number, doctor: Doctor): void {
    this.doctorsService.updateDoctor(id, doctor).subscribe({
      next: updatedDoctor => {
        this.saving = false;
        this.showForm = false;
        this.editingDoctorId = null;
        this.form = this.createEmptyDoctor();
        this.successMessage = 'Doctor details updated successfully.';
        this.loadDoctors();
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to update the doctor.'
        );
      }
    });
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

    return error.error?.message || fallback;
  }
}
