
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

export interface DoctorProfile {
  id: number;
  name: string;
  email: string;
  specialization?: string;
  phone?: string;
  available?: boolean;
}

export interface ClinicUser {
  id: number;
  username: string;
  email: string;
  role: string;
  doctor?: DoctorProfile | null;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
}

export interface CreateLinkedDoctorRequest extends CreateUserRequest {
  doctorId: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {

  private readonly apiUrl = 'http://localhost:8080/api/users';
  private readonly doctorsUrl = 'http://localhost:8080/api/doctors';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  /**
   * Creates authentication headers for secured backend endpoints.
   */
  private getHeaders(): HttpHeaders {
    const credentials = this.authService.getCredentials();

    if (!credentials) {
      throw new Error('You are not logged in.');
    }

    return new HttpHeaders({
      Authorization: `Basic ${credentials}`
    });
  }

  /**
   * Retrieves all user accounts.
   */
  getUsers(): Observable<ClinicUser[]> {
    return this.http.get<ClinicUser[]>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Retrieves existing doctor profiles.
   */
  getDoctors(): Observable<DoctorProfile[]> {
    return this.http.get<DoctorProfile[]>(
      this.doctorsUrl,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Creates a STAFF account.
   */
  createStaff(user: CreateUserRequest): Observable<ClinicUser> {
    return this.http.post<ClinicUser>(
      `${this.apiUrl}/register`,
      user,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Creates a doctor login account without a profile link.
   * Retained for compatibility with existing functionality.
   */
  createDoctorAccount(
    user: CreateUserRequest
  ): Observable<ClinicUser> {
    return this.http.post<ClinicUser>(
      `${this.apiUrl}/doctors`,
      user,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Creates a doctor login and links it to an existing doctor profile
   * in a single backend request.
   */
  createLinkedDoctorAccount(
    request: CreateLinkedDoctorRequest
  ): Observable<ClinicUser> {
    return this.http.post<ClinicUser>(
      `${this.apiUrl}/doctors/create-linked`,
      request,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Links an existing doctor login to a doctor profile.
   * Retained for accounts that already exist.
   */
  linkDoctorAccount(
    userId: number,
    doctorId: number
  ): Observable<ClinicUser> {
    return this.http.post<ClinicUser>(
      `${this.apiUrl}/${userId}/link-doctor`,
      null,
      {
        headers: this.getHeaders(),
        params: {
          doctorId: doctorId.toString()
        }
      }
    );
  }

  /**
   * Deletes a user account.
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
