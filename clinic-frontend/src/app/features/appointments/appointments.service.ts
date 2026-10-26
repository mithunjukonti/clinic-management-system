
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppointmentPerson {
  id: number;
  name: string;
  phone?: string;
  email?: string;

  // Patient details
  dateOfBirth?: string;
  gender?: string;

  // Doctor details
  specialization?: string;
  available?: boolean;
}

export interface Appointment {
  id?: number;
  patient: AppointmentPerson | null;
  doctor: AppointmentPerson | null;
  appointmentDateTime: string;
  reason: string | null;
  status: string | null;
}

export interface AppointmentRequest {
  patient: { id: number };
  doctor: { id: number };
  appointmentDateTime: string;
  reason: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private readonly apiUrl = 'http://localhost:8080/api/appointments';
  private readonly patientsUrl = 'http://localhost:8080/api/patients';
  private readonly doctorsUrl = 'http://localhost:8080/api/doctors';

  constructor(private readonly http: HttpClient) {}

  getAppointments(
    doctorId?: number,
    patientId?: number
  ): Observable<Appointment[]> {
    let params = new HttpParams();

    if (doctorId != null) {
      params = params.set('doctorId', doctorId);
    }

    if (patientId != null) {
      params = params.set('patientId', patientId);
    }

    return this.http.get<Appointment[]>(this.apiUrl, { params });
  }

  getPatients(): Observable<AppointmentPerson[]> {
    return this.http.get<AppointmentPerson[]>(this.patientsUrl);
  }

  getDoctors(): Observable<AppointmentPerson[]> {
    return this.http.get<AppointmentPerson[]>(this.doctorsUrl);
  }

  bookAppointment(
    request: AppointmentRequest
  ): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, request);
  }

  cancelAppointment(id: number): Observable<Appointment> {
    return this.http.patch<Appointment>(
      `${this.apiUrl}/${id}/cancel`,
      {}
    );
  }

  completeAppointment(id: number): Observable<Appointment> {
    return this.http.patch<Appointment>(
      `${this.apiUrl}/${id}/complete`,
      {}
    );
  }
}
