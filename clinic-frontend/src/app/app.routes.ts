
import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

import { LoginComponent } from './features/login/login.component';

import {
  AdminDashboardComponent
} from './features/dashboards/admin-dashboard/admin-dashboard.component';

import {
  DoctorDashboardComponent
} from './features/dashboards/doctor-dashboard/doctor-dashboard.component';

import {
  StaffDashboardComponent
} from './features/dashboards/staff-dashboard/staff-dashboard.component';

import {
  UnauthorizedComponent
} from './features/unauthorized/unauthorized.component';

import {
  PatientsComponent
} from './features/patients/patients.component';

import {
  DoctorsComponent
} from './features/doctors/doctors.component';

import {
  AppointmentsComponent
} from './features/appointments/appointments.component';

import {
  InvoicesComponent
} from './features/invoices/invoices.component';

import {
  MedicalRecordsComponent
} from './features/medical-records/medical-records.component';

import {
  UserManagementComponent
} from './features/user-management/user-management.component';

export const routes: Routes = [
  // Public route
  {
    path: 'login',
    component: LoginComponent
  },

  // Admin dashboard
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard],
    data: {
      roles: ['ADMIN']
    }
  },

  // Doctor dashboard
  {
    path: 'doctor-dashboard',
    component: DoctorDashboardComponent,
    canActivate: [authGuard],
    data: {
      roles: ['DOCTOR']
    }
  },

  // Staff dashboard
  {
    path: 'staff-dashboard',
    component: StaffDashboardComponent,
    canActivate: [authGuard],
    data: {
      roles: ['STAFF']
    }
  },

  // Patient management
  {
    path: 'patients',
    component: PatientsComponent,
    canActivate: [authGuard],
    data: {
      roles: ['ADMIN', 'STAFF']
    }
  },

  // Doctor management
  {
    path: 'doctors',
    component: DoctorsComponent,
    canActivate: [authGuard],
    data: {
      roles: ['ADMIN', 'STAFF', 'DOCTOR']
    }
  },

  // Appointment management
  {
    path: 'appointments',
    component: AppointmentsComponent,
    canActivate: [authGuard],
    data: {
      roles: ['ADMIN', 'STAFF', 'DOCTOR']
    }
  },

  // Medical records
  {
    path: 'medical-records',
    component: MedicalRecordsComponent,
    canActivate: [authGuard],
    data: {
      roles: ['DOCTOR']
    }
  },

  // Invoice management
  {
    path: 'invoices',
    component: InvoicesComponent,
    canActivate: [authGuard],
    data: {
      roles: ['ADMIN', 'STAFF']
    }
  },

  // User management — admin only
  {
    path: 'user-management',
    component: UserManagementComponent,
    canActivate: [authGuard],
    data: {
      roles: ['ADMIN']
    }
  },

  // Unauthorized access page
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },

  // Default route
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Unknown routes
  {
    path: '**',
    redirectTo: 'login'
  }
];
