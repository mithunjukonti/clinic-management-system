package com.clinic.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.clinic.entity.Appointment;
import com.clinic.entity.AppointmentStatus;
import com.clinic.entity.Doctor;
import com.clinic.entity.Patient;
import com.clinic.entity.User;
import com.clinic.entity.UserRole;
import com.clinic.exception.ResourceNotFoundException;
import com.clinic.repository.AppointmentRepository;
import com.clinic.repository.DoctorRepository;
import com.clinic.repository.PatientRepository;
import com.clinic.repository.UserRepository;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository,UserRepository userRepository) {

        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
    }

    // Book a new appointment
    @Transactional
    public Appointment bookAppointment(Appointment appointment) {

        if (appointment.getPatient() == null
                || appointment.getPatient().getId() == null) {
            throw new IllegalArgumentException("Patient ID is required");
        }

        if (appointment.getDoctor() == null
                || appointment.getDoctor().getId() == null) {
            throw new IllegalArgumentException("Doctor ID is required");
        }

        if (appointment.getAppointmentDateTime() == null
                || !appointment.getAppointmentDateTime()
                        .isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Appointment must be scheduled in the future");
        }

        Patient patient = patientRepository.findById(
                appointment.getPatient().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient not found with ID: "
                                + appointment.getPatient().getId()));

        Doctor doctor = doctorRepository.findById(
                appointment.getDoctor().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor not found with ID: "
                                + appointment.getDoctor().getId()));

        if (!Boolean.TRUE.equals(doctor.getAvailable())) {
            throw new IllegalArgumentException(
                    "This doctor is currently unavailable");
        }

        boolean conflict = appointmentRepository
                .existsByDoctorIdAndAppointmentDateTimeAndStatusNot(
                        doctor.getId(),
                        appointment.getAppointmentDateTime(),
                        AppointmentStatus.CANCELLED);

        if (conflict) {
            throw new IllegalArgumentException(
                    "Doctor already has an appointment at this time");
        }

        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setStatus(AppointmentStatus.BOOKED);

        return appointmentRepository.save(appointment);
    }

    // Get all appointments
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    // Get appointment by ID
    public Appointment getAppointmentById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment not found with ID: " + id));
    }

    // Get appointments by doctor
    public List<Appointment> getAppointmentsByDoctor(Long doctorId) {

        if (!doctorRepository.existsById(doctorId)) {
            throw new ResourceNotFoundException(
                    "Doctor not found with ID: " + doctorId);
        }

        return appointmentRepository.findByDoctorId(doctorId);
    }

    // Get appointments by patient
    public List<Appointment> getAppointmentsByPatient(Long patientId) {

        if (!patientRepository.existsById(patientId)) {
            throw new ResourceNotFoundException(
                    "Patient not found with ID: " + patientId);
        }

        return appointmentRepository.findByPatientId(patientId);
    }

    // Update an appointment
    @Transactional
    public Appointment updateAppointment(
            Long id, Appointment updatedAppointment) {

        Appointment existing = getAppointmentById(id);

        if (existing.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Cancelled appointments cannot be updated");
        }

        if (existing.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "Completed appointments cannot be updated");
        }

        if (updatedAppointment.getAppointmentDateTime() == null
                || !updatedAppointment.getAppointmentDateTime()
                        .isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Appointment must be scheduled in the future");
        }

        Long doctorId = existing.getDoctor().getId();

        boolean conflict = appointmentRepository
                .existsByDoctorIdAndAppointmentDateTimeAndStatusNot(
                        doctorId,
                        updatedAppointment.getAppointmentDateTime(),
                        AppointmentStatus.CANCELLED);

        if (conflict
                && !existing.getAppointmentDateTime()
                        .equals(updatedAppointment.getAppointmentDateTime())) {
            throw new IllegalArgumentException(
                    "Doctor already has an appointment at this time");
        }

        existing.setAppointmentDateTime(
                updatedAppointment.getAppointmentDateTime());

        existing.setReason(updatedAppointment.getReason());

        return appointmentRepository.save(existing);
    }

    // Cancel an appointment
    @Transactional
    public Appointment cancelAppointment(Long id) {

        Appointment appointment = getAppointmentById(id);

        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "Completed appointments cannot be cancelled");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);

        return appointmentRepository.save(appointment);
    }

    // Complete an appointment
    @Transactional
    public Appointment completeAppointment(Long id) {

        Appointment appointment = getAppointmentById(id);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Cancelled appointments cannot be completed");
        }

        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "Appointment is already completed");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);

        return appointmentRepository.save(appointment);
    }

    // Delete an appointment
    @Transactional
    public void deleteAppointment(Long id) {

        Appointment appointment = getAppointmentById(id);

        appointmentRepository.delete(appointment);
    }
    
    public Long getLinkedDoctorId(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found: " + username));

        if (user.getRole() != UserRole.DOCTOR) {
            throw new IllegalArgumentException(
                    "This operation is only available to doctor accounts");
        }

        if (user.getDoctor() == null) {
            throw new IllegalArgumentException(
                    "No doctor profile is linked to this account");
        }

        return user.getDoctor().getId();
    }
    
    public Appointment getAppointmentForDoctor(
            Long appointmentId, Long doctorId) {

        Appointment appointment = getAppointmentById(appointmentId);

        if (!appointment.getDoctor().getId().equals(doctorId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You cannot access another doctor's appointment");
        }

        return appointment;
    }
}