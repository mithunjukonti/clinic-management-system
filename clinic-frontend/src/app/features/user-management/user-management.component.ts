
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  ClinicUser,
  DoctorProfile,
  UserManagementService
} from './user-management.service';

import { AuthService } from '../../core/auth/auth.service';

type AccountRole = 'ADMIN' | 'STAFF' | 'DOCTOR';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users: ClinicUser[] = [];
  doctors: DoctorProfile[] = [];

  selectedRole: AccountRole = 'STAFF';
  searchTerm = '';

  loading = false;
  loadingDoctors = false;
  saving = false;
  deletingUserId: number | null = null;

  error = '';
  success = '';
  showForm = false;

  accountType: 'STAFF' | 'DOCTOR' = 'STAFF';
  selectedDoctorId: number | null = null;

  form = {
    username: '',
    email: '',
    password: ''
  };

  constructor(
    private readonly userService: UserManagementService,
    readonly authService: AuthService,
    private readonly router: Router
  ) {}

  get username(): string {
    return this.authService.getCurrentUser()?.username
      ?? 'Administrator';
  }

  get selectedDoctor(): DoctorProfile | undefined {
    return this.doctors.find(
      doctor => doctor.id === this.selectedDoctorId
    );
  }

  get availableDoctors(): DoctorProfile[] {
    return this.doctors.filter(
      doctor => !this.isDoctorLinked(doctor.id)
    );
  }

  // Display newest accounts first.
  get sortedUsers(): ClinicUser[] {
    return [...this.users].sort((a, b) => b.id - a.id);
  }

  get adminCount(): number {
    return this.users.filter(user => user.role === 'ADMIN').length;
  }

  get staffCount(): number {
    return this.users.filter(user => user.role === 'STAFF').length;
  }

  get doctorCount(): number {
    return this.users.filter(user => user.role === 'DOCTOR').length;
  }

  // Accounts shown in the selected role tab.
  get filteredUsers(): ClinicUser[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.sortedUsers.filter(user => {
      if (user.role !== this.selectedRole) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchableText = [
        this.getDisplayName(user),
        user.username,
        user.email,
        user.role,
        String(user.id)
      ].join(' ').toLowerCase();

      return searchableText.includes(term);
    });
  }

  get selectedRoleTitle(): string {
    switch (this.selectedRole) {
      case 'ADMIN':
        return 'Administrator Accounts';
      case 'STAFF':
        return 'Staff Accounts';
      case 'DOCTOR':
        return 'Doctor Accounts';
    }
  }

  getDisplayName(user: ClinicUser): string {
    if (user.doctor?.name) {
      return user.doctor.name;
    }

    if (user.role === 'ADMIN') {
      return 'Administrator';
    }

    return user.username;
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadDoctors();
  }

  selectRole(role: AccountRole): void {
    this.selectedRole = role;
    this.searchTerm = '';
    this.error = '';
    this.success = '';
  }

  loadUsers(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.userService.getUsers().subscribe({
      next: users => {
        this.users = users;
        this.loading = false;
      },
      error: err => {
        this.loading = false;

        if (err.status === 401) {
          this.error =
            'Your session has expired. Please log in again.';
        } else if (err.status === 403) {
          this.error =
            'Only administrators can manage user accounts.';
        } else {
          this.error =
            'Could not load user accounts. Check the backend.';
        }
      }
    });
  }

  loadDoctors(): void {
    this.loadingDoctors = true;

    this.userService.getDoctors().subscribe({
      next: doctors => {
        this.doctors = doctors;
        this.loadingDoctors = false;
      },
      error: err => {
        this.loadingDoctors = false;

        if (err.status === 401 || err.status === 403) {
          this.error =
            'You are not authorized to load doctor profiles.';
        } else {
          this.error =
            'Could not load doctor profiles. Check the doctors API.';
        }
      }
    });
  }

  isDoctorLinked(doctorId: number): boolean {
    return this.users.some(
      user => user.doctor?.id === doctorId
    );
  }

  openCreateForm(
    type: 'STAFF' | 'DOCTOR' = 'STAFF'
  ): void {
    this.accountType = type;
    this.selectedDoctorId = null;

    this.form = {
      username: '',
      email: '',
      password: ''
    };

    this.error = '';
    this.success = '';
    this.showForm = true;
  }

  onAccountTypeChange(): void {
    this.selectedDoctorId = null;
    this.form.email = '';
    this.error = '';
  }

  onDoctorChange(): void {
    this.form.email = this.selectedDoctor?.email ?? '';
  }

  closeCreateForm(): void {
    if (this.saving) {
      return;
    }

    this.showForm = false;
    this.error = '';
  }

  createUser(): void {
    this.error = '';
    this.success = '';

    const username = this.form.username.trim();
    const email = this.form.email.trim();
    const password = this.form.password;

    if (!username || !email || !password) {
      this.error = 'Please fill in all fields.';
      return;
    }

    if (username.length < 4 || username.length > 50) {
      this.error =
        'Username must contain between 4 and 50 characters.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    if (password.length < 8) {
      this.error =
        'Password must contain at least 8 characters.';
      return;
    }

    if (this.accountType === 'DOCTOR') {
      const doctor = this.selectedDoctor;

      if (!doctor) {
        this.error = 'Please select a doctor profile.';
        return;
      }

      if (this.isDoctorLinked(doctor.id)) {
        this.error =
          'This doctor already has a linked login account. Refresh and select another doctor.';
        return;
      }

      if (
        !doctor.email ||
        doctor.email.toLowerCase() !== email.toLowerCase()
      ) {
        this.error =
          "The account email must match the selected doctor's email.";
        return;
      }
    }

    this.saving = true;

    const request = {
      username,
      email,
      password
    };

    const operation = this.accountType === 'STAFF'
      ? this.userService.createStaff(request)
      : this.userService.createLinkedDoctorAccount({
          ...request,
          doctorId: this.selectedDoctorId!
        });

    operation.subscribe({
      next: () => {
        const createdRole = this.accountType;

        this.saving = false;
        this.showForm = false;
        this.selectedDoctorId = null;

        this.form = {
          username: '',
          email: '',
          password: ''
        };

        this.error = '';
        this.success = createdRole === 'DOCTOR'
          ? `Doctor login account "${username}" created and linked successfully.`
          : `Staff account "${username}" created successfully.`;

        this.loadUsers();
      },
      error: err => {
        this.saving = false;

        if (err.status === 400 || err.status === 409) {
          this.error =
            err.error?.message ??
            'The username, email or doctor profile may already be in use.';
        } else if (err.status === 401) {
          this.error =
            'Authentication failed. Please log in again.';
        } else if (err.status === 403) {
          this.error =
            'Only administrators can create these accounts.';
        } else {
          this.error =
            'Account creation failed. Check the backend logs.';
        }
      }
    });
  }

  deleteUser(user: ClinicUser): void {
    this.error = '';
    this.success = '';

    const currentUserId =
      this.authService.getCurrentUser()?.id;

    if (user.id === currentUserId) {
      this.error =
        'You cannot delete your own administrator account.';
      return;
    }

    if (this.deletingUserId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the account "${user.username}"?`
    );

    if (!confirmed) {
      return;
    }

    this.deletingUserId = user.id;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(
          existingUser => existingUser.id !== user.id
        );

        this.deletingUserId = null;
        this.error = '';
        this.success =
          `Account "${user.username}" deleted successfully.`;
      },
      error: err => {
        this.deletingUserId = null;

        if (err.status === 401) {
          this.error =
            'Authentication failed. Please log in again.';
        } else if (err.status === 403) {
          this.error =
            'You are not authorized to delete accounts.';
        } else if (err.status === 409) {
          this.error =
            'This account is linked to existing records and cannot be deleted.';
        } else {
          this.error =
            'Could not delete this account. Check the backend logs.';
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
