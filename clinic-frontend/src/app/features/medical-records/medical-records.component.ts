
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  Appointment,
  AppointmentsService
} from '../appointments/appointments.service';

import {
  MedicalRecord,
  MedicalRecordRequest,
  MedicalRecordsService
} from './medical-records.service';

interface PatientSummary {
  id: number;
  name: string;
  completedAppointments: number;
}

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medical-records.component.html',
  styleUrl: './medical-records.component.css'
})
export class MedicalRecordsComponent implements OnInit {
  appointments: Appointment[] = [];
  patients: PatientSummary[] = [];
  records: MedicalRecord[] = [];

  selectedPatientId: number | null = null;
  selectedAppointmentId: number | null = null;

  searchTerm = '';

  loadingAppointments = false;
  loadingRecords = false;
  savingRecord = false;

  appointmentsError = '';
  recordsError = '';
  formError = '';
  successMessage = '';

  showCreateForm = false;

  form = {
    symptoms: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    followUpDate: ''
  };

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly medicalRecordsService: MedicalRecordsService
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  get filteredPatients(): PatientSummary[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.patients;
    }

    return this.patients.filter(patient =>
      patient.name.toLowerCase().includes(term) ||
      String(patient.id).includes(term)
    );
  }

  get selectedPatient(): PatientSummary | undefined {
    return this.patients.find(
      patient => patient.id === this.selectedPatientId
    );
  }

  get completedAppointmentsForPatient(): Appointment[] {
    if (this.selectedPatientId === null) {
      return [];
    }

    return this.appointments.filter(appointment =>
      appointment.status?.toUpperCase() === 'COMPLETED' &&
      appointment.patient?.id === this.selectedPatientId
    );
  }

  get selectedAppointment(): Appointment | undefined {
    return this.completedAppointmentsForPatient.find(
      appointment => appointment.id === this.selectedAppointmentId
    );
  }

  loadAppointments(): void {
    this.loadingAppointments = true;
    this.appointmentsError = '';

    this.appointmentsService.getAppointments().subscribe({
      next: appointments => {
        this.appointments = appointments;

        const patientMap = new Map<number, PatientSummary>();

        appointments
          .filter(appointment =>
            appointment.status?.toUpperCase() === 'COMPLETED' &&
            appointment.patient !== null
          )
          .forEach(appointment => {
            const patient = appointment.patient!;

            if (!patientMap.has(patient.id)) {
              patientMap.set(patient.id, {
                id: patient.id,
                name: patient.name?.trim() || `Patient ${patient.id}`,
                completedAppointments: 0
              });
            }

            patientMap.get(patient.id)!.completedAppointments++;
          });

        this.patients = Array.from(patientMap.values()).sort(
          (a, b) => a.name.localeCompare(b.name)
        );

        if (
          this.selectedPatientId !== null &&
          !this.patients.some(p => p.id === this.selectedPatientId)
        ) {
          this.selectedPatientId = null;
          this.selectedAppointmentId = null;
          this.records = [];
          this.showCreateForm = false;
        }

        this.loadingAppointments = false;
      },
      error: error => {
        console.error('Failed to load appointments:', error);
        this.appointmentsError =
          'Unable to load your completed appointments. Check your login and try again.';
        this.loadingAppointments = false;
      }
    });
  }

  selectPatient(patientId: number): void {
    this.selectedPatientId = patientId;
    this.selectedAppointmentId = null;
    this.records = [];
    this.recordsError = '';
    this.formError = '';
    this.successMessage = '';
    this.showCreateForm = false;
    this.resetForm();
    this.loadRecords();
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  loadRecords(): void {
    if (this.selectedPatientId === null) {
      return;
    }

    this.loadingRecords = true;
    this.recordsError = '';

    this.medicalRecordsService
      .getRecordsByPatient(this.selectedPatientId)
      .subscribe({
        next: records => {
          this.records = records.sort(
            (a, b) => b.visitDate.localeCompare(a.visitDate)
          );
          this.loadingRecords = false;
        },
        error: error => {
          console.error('Failed to load medical records:', error);
          this.recordsError =
            'Unable to load medical records. Check your login and try again.';
          this.loadingRecords = false;
        }
      });
  }

  openCreateForm(): void {
    if (this.selectedPatientId === null) {
      return;
    }

    this.showCreateForm = true;
    this.formError = '';
    this.successMessage = '';
    this.selectedAppointmentId = null;
    this.resetForm();
  }

  cancelCreateForm(): void {
    this.showCreateForm = false;
    this.formError = '';
    this.resetForm();
  }

  saveMedicalRecord(): void {
    if (this.selectedPatientId === null) {
      this.formError = 'Please select a patient first.';
      return;
    }

    const appointment = this.selectedAppointment;

    if (!appointment?.id || !appointment.appointmentDateTime) {
      this.formError = 'Please select a completed appointment.';
      return;
    }

    const symptoms = this.form.symptoms.trim();
    const diagnosis = this.form.diagnosis.trim();
    const treatment = this.form.treatment.trim();
    const prescription = this.form.prescription.trim();

    if (!symptoms || !diagnosis || !treatment) {
      this.formError =
        'Please enter symptoms, diagnosis, and treatment.';
      return;
    }

    if (this.form.followUpDate) {
      const today = new Date();
      const todayDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')
      ].join('-');

      if (this.form.followUpDate < todayDate) {
        this.formError = 'Follow-up date cannot be in the past.';
        return;
      }
    }

    const request: MedicalRecordRequest = {
      patient: {
        id: this.selectedPatientId
      },
      appointment: {
        id: appointment.id
      },
      symptoms,
      diagnosis,
      treatment,
      prescription,
      // The backend derives visitDate from the appointment.
      // Include it here because the current backend validates the entity first.
      visitDate: appointment.appointmentDateTime.substring(0, 10),
      ...(this.form.followUpDate
        ? { followUpDate: this.form.followUpDate }
        : {})
    };

    this.savingRecord = true;
    this.formError = '';
    this.successMessage = '';

    this.medicalRecordsService.createMedicalRecord(request).subscribe({
      next: () => {
        this.savingRecord = false;
        this.showCreateForm = false;
        this.successMessage = 'Medical record created successfully.';
        this.resetForm();
        this.loadRecords();
      },
      error: error => {
        console.error('Failed to create medical record:', error);

        const backendMessage =
          error?.error?.message || error?.error?.error;

        this.formError = backendMessage
          ? `Unable to save the medical record: ${backendMessage}`
          : 'Unable to save the medical record. Verify the appointment and your access, then try again.';

        this.savingRecord = false;
      }
    });
  }

  private resetForm(): void {
    this.form = {
      symptoms: '',
      diagnosis: '',
      treatment: '',
      prescription: '',
      followUpDate: ''
    };
  }
}
