
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import {
  Invoice,
  InvoiceAppointment,
  InvoiceStatus,
  InvoicesService
} from './invoices.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.css'
})
export class InvoicesComponent implements OnInit {
  invoices: Invoice[] = [];
  appointments: InvoiceAppointment[] = [];

  loading = false;
  saving = false;
  showForm = false;

  searchTerm = '';
  statusFilter = 'ALL';

  appointmentId: number | null = null;
  consultationFee: number | null = null;

  selectedInvoice: Invoice | null = null;

  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
    this.loadAppointments();
  }

  get userRole(): string | null {
    return this.authService.getRole();
  }

  get canManageInvoices(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'STAFF';
  }

  get filteredInvoices(): Invoice[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.invoices.filter(invoice => {
      const matchesStatus =
        this.statusFilter === 'ALL' ||
        invoice.status === this.statusFilter;

      const searchableValues = [
        invoice.id?.toString(),
        invoice.patient?.name,
        invoice.patient?.email,
        invoice.patient?.phone,
        invoice.appointment?.doctor?.name,
        invoice.appointment?.doctor?.specialization,
        invoice.status
      ];

      const matchesSearch =
        !query ||
        searchableValues.some(value =>
          value?.toLowerCase().includes(query)
        );

      return matchesStatus && matchesSearch;
    });
  }

  get availableAppointments(): InvoiceAppointment[] {
    const invoicedAppointmentIds = new Set(
      this.invoices.map(invoice => invoice.appointment?.id)
    );

    return this.appointments.filter(appointment =>
      appointment.status?.toUpperCase() === 'COMPLETED' &&
      !invoicedAppointmentIds.has(appointment.id)
    );
  }

  get pendingTotal(): number {
    return this.invoices
      .filter(invoice => invoice.status === 'PENDING')
      .reduce(
        (total, invoice) => total + Number(invoice.consultationFee || 0),
        0
      );
  }

  get paidTotal(): number {
    return this.invoices
      .filter(invoice => invoice.status === 'PAID')
      .reduce(
        (total, invoice) => total + Number(invoice.consultationFee || 0),
        0
      );
  }

  loadInvoices(): void {
    this.loading = true;
    this.errorMessage = '';

    this.invoicesService.getInvoices().subscribe({
      next: invoices => {
        this.invoices = invoices;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load invoices.'
        );
      }
    });
  }

  loadAppointments(): void {
    this.invoicesService.getAppointments().subscribe({
      next: appointments => {
        this.appointments = appointments;
      },
      error: error => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load appointments.'
        );
      }
    });
  }

  openForm(): void {
    if (!this.canManageInvoices) {
      return;
    }

    this.appointmentId = null;
    this.consultationFee = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) {
      return;
    }

    this.showForm = false;
    this.appointmentId = null;
    this.consultationFee = null;
    this.errorMessage = '';
  }

  generateInvoice(): void {
    if (!this.canManageInvoices || this.saving) {
      return;
    }

    if (this.appointmentId == null) {
      this.errorMessage = 'Please select a completed appointment.';
      return;
    }

    if (
      this.consultationFee == null ||
      !Number.isFinite(this.consultationFee) ||
      this.consultationFee <= 0
    ) {
      this.errorMessage = 'Consultation fee must be greater than zero.';
      return;
    }

    const appointment = this.availableAppointments.find(
      item => item.id === this.appointmentId
    );

    if (!appointment) {
      this.errorMessage =
        'This appointment is not available for invoicing. Refresh and try again.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.invoicesService
      .generateInvoice(this.appointmentId, this.consultationFee)
      .subscribe({
        next: invoice => {
          this.saving = false;
          this.showForm = false;
          this.appointmentId = null;
          this.consultationFee = null;
          this.successMessage =
            `Invoice #${invoice.id} generated successfully.`;

          this.loadInvoices();
          this.loadAppointments();
        },
        error: error => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to generate invoice.'
          );
        }
      });
  }

  updateStatus(invoice: Invoice, status: InvoiceStatus): void {
    if (
      !this.canManageInvoices ||
      invoice.id == null ||
      invoice.status === 'CANCELLED' ||
      invoice.status === 'PAID'
    ) {
      return;
    }

    const action =
      status === 'PAID'
        ? 'mark this invoice as paid'
        : 'cancel this invoice';

    if (!window.confirm(`Are you sure you want to ${action}?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.invoicesService
      .updateInvoiceStatus(invoice.id, status)
      .subscribe({
        next: updatedInvoice => {
          this.successMessage =
            `Invoice #${updatedInvoice.id} updated to ${updatedInvoice.status}.`;

          this.loadInvoices();

          if (this.selectedInvoice?.id === updatedInvoice.id) {
            this.selectedInvoice = updatedInvoice;
          }
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to update invoice status.'
          );
        }
      });
  }

  viewInvoice(invoice: Invoice): void {
    if (invoice.id == null) {
      return;
    }

    this.errorMessage = '';

    this.invoicesService.getInvoiceById(invoice.id).subscribe({
      next: detailedInvoice => {
        this.selectedInvoice = detailedInvoice;
      },
      error: error => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load invoice details.'
        );
      }
    });
  }

  closeInvoiceDetails(): void {
    this.selectedInvoice = null;
  }

  printInvoice(): void {
    if (!this.selectedInvoice) {
      return;
    }

    window.print();
  }

  refresh(): void {
    this.loadInvoices();
    this.loadAppointments();
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

    if (error.error?.message) {
      return error.error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    return fallback;
  }
}
