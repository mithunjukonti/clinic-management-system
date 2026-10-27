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
  editingRecord: MedicalRecord | null = null;

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

  get recordedAppointmentIds(): Set<number> {
    return new Set(
      this.records
        .map(record => record.appointment?.id)
        .filter((id): id is number => id != null)
    );
  }

  // FIX: Ignore appointments without a valid ID.
  get availableAppointments(): Appointment[] {
    return this.completedAppointmentsForPatient.filter(
      appointment =>
        appointment.id != null &&
        !this.recordedAppointmentIds.has(appointment.id)
    );
  }

  get selectedAppointment(): Appointment | undefined {
    return this.completedAppointmentsForPatient.find(
      appointment => appointment.id === this.selectedAppointmentId
    );
  }

  get totalRecords(): number {
    return this.records.length;
  }

  get completedVisitCount(): number {
    return this.completedAppointmentsForPatient.length;
  }

  get pendingRecordCount(): number {
    return this.availableAppointments.length;
  }

  get followUpCount(): number {
    const today = this.todayString();

    return this.records.filter(record =>
      !!record.followUpDate && record.followUpDate >= today
    ).length;
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
            appointment.patient != null
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
          this.editingRecord = null;
        }

        this.loadingAppointments = false;

        if (this.selectedPatientId !== null) {
          this.loadRecords();
        }
      },

      error: error => {
        console.error('Failed to load appointments:', error);

        this.appointmentsError =
          'Unable to load completed appointments. Please try again.';

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
    this.editingRecord = null;

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
          this.records = [...records].sort(
            (a, b) => b.visitDate.localeCompare(a.visitDate)
          );

          this.loadingRecords = false;
        },

        error: error => {
          console.error('Failed to load medical records:', error);

          this.recordsError =
            'Unable to load medical records. Please check your access and retry.';

          this.loadingRecords = false;
        }
      });
  }

  openCreateForm(): void {
    if (
      this.selectedPatientId === null ||
      this.availableAppointments.length === 0
    ) {
      return;
    }

    this.showCreateForm = true;
    this.editingRecord = null;
    this.formError = '';
    this.successMessage = '';
    this.selectedAppointmentId = null;

    this.resetForm();
  }

  editMedicalRecord(record: MedicalRecord): void {
    this.editingRecord = record;
    this.showCreateForm = true;
    this.formError = '';
    this.successMessage = '';
    this.selectedAppointmentId = record.appointment.id;

    this.form = {
      symptoms: record.symptoms || '',
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      prescription: record.prescription || '',
      followUpDate: record.followUpDate || ''
    };

    document.querySelector('.record-form-card')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  }

  cancelCreateForm(): void {
    this.showCreateForm = false;
    this.formError = '';
    this.editingRecord = null;
    this.selectedAppointmentId = null;

    this.resetForm();
  }

  saveMedicalRecord(): void {
    if (this.selectedPatientId === null) {
      this.formError = 'Please select a patient first.';
      return;
    }

    const appointment = this.editingRecord
      ? this.completedAppointmentsForPatient.find(
          item => item.id === this.editingRecord!.appointment.id
        )
      : this.selectedAppointment;

    if (!appointment?.id || !appointment.appointmentDateTime) {
      this.formError =
        'Please select a valid completed appointment.';
      return;
    }

    const symptoms = this.form.symptoms.trim();
    const diagnosis = this.form.diagnosis.trim();
    const treatment = this.form.treatment.trim();
    const prescription = this.form.prescription.trim();

    if (!symptoms || !diagnosis || !treatment) {
      this.formError =
        'Symptoms, diagnosis, and treatment are required.';
      return;
    }

    if (this.form.followUpDate) {
      const visitDate = this.editingRecord
        ? this.editingRecord.visitDate
        : appointment.appointmentDateTime.substring(0, 10);

      if (this.form.followUpDate < visitDate) {
        this.formError =
          'Follow-up date cannot be earlier than the visit date.';
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

      visitDate: this.editingRecord
        ? this.editingRecord.visitDate
        : appointment.appointmentDateTime.substring(0, 10),

      ...(this.form.followUpDate
        ? { followUpDate: this.form.followUpDate }
        : {})
    };

    this.savingRecord = true;
    this.formError = '';
    this.successMessage = '';

    const operation = this.editingRecord
      ? this.medicalRecordsService.updateMedicalRecord(
          this.editingRecord.id,
          request
        )
      : this.medicalRecordsService.createMedicalRecord(request);

    operation.subscribe({
      next: () => {
        const wasEditing = this.editingRecord !== null;

        this.savingRecord = false;
        this.showCreateForm = false;
        this.editingRecord = null;
        this.selectedAppointmentId = null;

        this.resetForm();

        this.successMessage = wasEditing
          ? 'Medical record updated successfully.'
          : 'Medical record created successfully.';

        this.loadRecords();
      },

      error: error => {
        console.error('Failed to save medical record:', error);

        const backendMessage =
          error?.error?.message || error?.error?.error;

        this.formError = backendMessage
          ? `Unable to save the record: ${backendMessage}`
          : 'Unable to save the medical record. Please verify the details and try again.';

        this.savingRecord = false;
      }
    });
  }

  trackRecordById(
    index: number,
    record: MedicalRecord
  ): number {
    return record.id;
  }

  private todayString(): string {
    const today = new Date();

    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');
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