
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

import {
  Patient,
  PatientsService
} from './patients.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.css'
})
export class PatientsComponent implements OnInit {
  patients: Patient[] = [];
  searchTerm = '';

  loading = false;
  saving = false;
  showForm = false;
  editingPatientId: number | null = null;

  successMessage = '';
  errorMessage = '';

  readonly maxDate = new Date().toISOString().slice(0, 10);

  form: Patient = this.createEmptyPatient();

  constructor(
    private readonly patientsService: PatientsService,
    private readonly authService: AuthService
  ) {}

  get dashboardRoute(): string {
    const role = this.authService.getRole();

    return role === 'ADMIN'
      ? '/admin-dashboard'
      : '/staff-dashboard';
  }

  ngOnInit(): void {
    this.loadPatients();
  }

  private createEmptyPatient(): Patient {
    return {
      name: '',
      dateOfBirth: null,
      gender: '',
      phone: '',
      email: '',
      address: ''
    };
  }

  get isEditing(): boolean {
    return this.editingPatientId !== null;
  }

  get filteredPatients(): Patient[] {
    const query = this.searchTerm.trim().toLowerCase();

    if (!query) {
      return this.patients;
    }

    return this.patients.filter(patient =>
      [
        patient.name,
        patient.phone,
        patient.email
      ].some(value => value?.toLowerCase().includes(query))
    );
  }

  loadPatients(): void {
    this.loading = true;
    this.errorMessage = '';

    this.patientsService.getPatients().subscribe({
      next: patients => {
        this.patients = patients;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load patients.'
        );
      }
    });
  }

  openForm(): void {
    this.form = this.createEmptyPatient();
    this.editingPatientId = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.showForm = true;
  }

  editPatient(patient: Patient): void {
    if (patient.id == null) {
      this.errorMessage = 'Cannot edit this patient because the ID is missing.';
      return;
    }

    this.form = {
      id: patient.id,
      name: patient.name ?? '',
      dateOfBirth: patient.dateOfBirth || null,
      gender: patient.gender ?? '',
      phone: patient.phone ?? '',
      email: patient.email ?? '',
      address: patient.address ?? ''
    };

    this.editingPatientId = patient.id;
    this.successMessage = '';
    this.errorMessage = '';
    this.showForm = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingPatientId = null;
    this.form = this.createEmptyPatient();
    this.errorMessage = '';
  }

  savePatient(): void {
    if (this.saving) {
      return;
    }

    const patient: Patient = {
      name: this.form.name.trim(),
      dateOfBirth: this.form.dateOfBirth || null,
      gender: this.form.gender,
      phone: this.form.phone.trim(),
      email: this.form.email.trim(),
      address: this.form.address.trim()
    };

    if (!patient.name || !patient.phone) {
      this.errorMessage = 'Patient name and phone are required.';
      return;
    }

    if (patient.name.length > 100) {
      this.errorMessage = 'Patient name cannot exceed 100 characters.';
      return;
    }

    if (patient.dateOfBirth && patient.dateOfBirth > this.maxDate) {
      this.errorMessage = 'Date of birth cannot be in the future.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editingPatientId !== null) {
      this.updateExistingPatient(this.editingPatientId, patient);
    } else {
      this.registerNewPatient(patient);
    }
  }

  private registerNewPatient(patient: Patient): void {
    this.patientsService.createPatient(patient).subscribe({
      next: createdPatient => {
        this.saving = false;
        this.showForm = false;
        this.editingPatientId = null;
        this.form = this.createEmptyPatient();
        this.successMessage = 'Patient registered successfully.';

        if (createdPatient.id != null) {
          this.patients = [
            createdPatient,
            ...this.patients.filter(
              existing => existing.id !== createdPatient.id
            )
          ];
        } else {
          this.loadPatients();
        }
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to register the patient.'
        );
      }
    });
  }

  private updateExistingPatient(
    id: number,
    patient: Patient
  ): void {
    this.patientsService.updatePatient(id, patient).subscribe({
      next: updatedPatient => {
        this.saving = false;
        this.showForm = false;
        this.editingPatientId = null;
        this.form = this.createEmptyPatient();
        this.successMessage = 'Patient details updated successfully.';

        if (updatedPatient && updatedPatient.id != null) {
          this.patients = this.patients.map(existing =>
            existing.id === id ? updatedPatient : existing
          );
        } else {
          this.loadPatients();
        }
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to update the patient.'
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

    if (error.status === 400 && error.error?.message) {
      return error.error.message;
    }

    return error.error?.message || fallback;
  }
}
