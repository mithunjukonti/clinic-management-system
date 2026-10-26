
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface InvoicePerson {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

export interface InvoiceDoctor {
  id: number;
  name: string;
  specialization?: string;
}

export interface InvoiceAppointment {
  id: number;
  patient: InvoicePerson | null;
  doctor: InvoiceDoctor | null;
  appointmentDateTime: string;
  status: string;
  reason?: string | null;
}

export interface Invoice {
  id: number;
  patient: InvoicePerson;
  appointment: InvoiceAppointment;
  consultationFee: number;
  invoiceDate: string;
  status: InvoiceStatus;
}

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private readonly invoicesUrl = 'http://localhost:8080/api/invoices';
  private readonly appointmentsUrl = 'http://localhost:8080/api/appointments';

  constructor(private readonly http: HttpClient) {}

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.invoicesUrl);
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.invoicesUrl}/${id}`);
  }

  getAppointments(): Observable<InvoiceAppointment[]> {
    return this.http.get<InvoiceAppointment[]>(this.appointmentsUrl);
  }

  generateInvoice(
    appointmentId: number,
    consultationFee: number
  ): Observable<Invoice> {
    const params = new HttpParams()
      .set('appointmentId', appointmentId)
      .set('consultationFee', consultationFee.toString());

    return this.http.post<Invoice>(
      this.invoicesUrl,
      null,
      { params }
    );
  }

  updateInvoiceStatus(
    id: number,
    status: InvoiceStatus
  ): Observable<Invoice> {
    const params = new HttpParams().set('status', status);

    return this.http.patch<Invoice>(
      `${this.invoicesUrl}/${id}/status`,
      null,
      { params }
    );
  }
}
