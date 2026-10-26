
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Doctor {
  id?: number;
  name: string;
  specialization: string;
  phone: string;
  email: string;
  available: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorsService {
  private readonly apiUrl = 'http://localhost:8080/api/doctors';

  constructor(private readonly http: HttpClient) {}

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.apiUrl);
  }

  createDoctor(doctor: Doctor): Observable<Doctor> {
    return this.http.post<Doctor>(this.apiUrl, doctor);
  }

  updateDoctor(id: number, doctor: Doctor): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.apiUrl}/${id}`, doctor);
  }
}
