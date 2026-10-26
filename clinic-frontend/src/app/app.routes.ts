
import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/login/login.component';

import { AdminDashboardComponent } from './features/dashboards/admin-dashboard/admin-dashboard.component';
import { DoctorDashboardComponent } from './features/dashboards/doctor-dashboard/doctor-dashboard.component';
import { StaffDashboardComponent } from './features/dashboards/staff-dashboard/staff-dashboard.component';

import { UnauthorizedComponent } from './features/unauthorized/unauthorized.component';
import { PatientsComponent } from './features/patients/patients.component';
import { DoctorsComponent } from './features/doctors/doctors.component';
import { AppointmentsComponent } from './features/appointments/appointments.component';
import { InvoicesComponent } from './features/invoices/invoices.component';
import { MedicalRecordsComponent } from './features/medical-records/medical-records.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'doctor-dashboard',
    component: DoctorDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['DOCTOR'] }
  },
  {
    path: 'staff-dashboard',
    component: StaffDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF'] }
  },
  {
    path: 'patients',
    component: PatientsComponent,
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'STAFF'] }
  },
  {
    path: 'doctors',
    component: DoctorsComponent,
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'STAFF', 'DOCTOR'] }
  },
  {
    path: 'appointments',
    component: AppointmentsComponent,
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'STAFF', 'DOCTOR'] }
  },
  {
    path: 'medical-records',
    component: MedicalRecordsComponent,
    canActivate: [authGuard],
    data: { roles: ['DOCTOR'] }
  },
  {
    path: 'invoices',
    component: InvoicesComponent,
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'STAFF'] }
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
