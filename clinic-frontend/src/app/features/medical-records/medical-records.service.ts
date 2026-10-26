
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MedicalRecord {
  id: number;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  prescription?: string | null;
  visitDate: string;
  followUpDate?: string | null;
  createdAt?: string;
  patient: {
    id: number;
    name?: string;
  };
  appointment: {
    id: number;
    appointmentDateTime?: string;
    doctor?: {
      id: number;
      name: string;
    };
  };
}

export interface MedicalRecordRequest {
  patient: {
    id: number;
  };
  appointment: {
    id: number;
  };
  symptoms: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  visitDate: string;
  followUpDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordsService {
  private readonly apiUrl = 'http://localhost:8080/api/medical-records';

  constructor(private readonly http: HttpClient) {}

  getRecordsByPatient(patientId: number): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(
      `${this.apiUrl}/patient/${patientId}`
    );
  }

  getRecordById(id: number): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(`${this.apiUrl}/${id}`);
  }

  createMedicalRecord(
    request: MedicalRecordRequest
  ): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(this.apiUrl, request);
  }
}
