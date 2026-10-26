
package com.clinic.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.clinic.entity.Appointment;
import com.clinic.entity.AppointmentStatus;
import com.clinic.entity.MedicalRecord;
import com.clinic.entity.Patient;
import com.clinic.entity.User;
import com.clinic.entity.UserRole;
import com.clinic.exception.ResourceNotFoundException;
import com.clinic.repository.AppointmentRepository;
import com.clinic.repository.MedicalRecordRepository;
import com.clinic.repository.PatientRepository;
import com.clinic.repository.UserRepository;

@Service
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    public MedicalRecordService(
            MedicalRecordRepository medicalRecordRepository,
            PatientRepository patientRepository,
            UserRepository userRepository,
            AppointmentRepository appointmentRepository) {

        this.medicalRecordRepository = medicalRecordRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
    }

    private User getUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("Authentication is required");
        }

        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + authentication.getName()));
    }

    private void checkDoctorAppointmentAccess(
            Appointment appointment,
            Authentication authentication) {

        User user = getUser(authentication);

        if (user.getRole() != UserRole.DOCTOR) {
            return;
        }

        if (user.getDoctor() == null
                || appointment.getDoctor() == null
                || !user.getDoctor().getId().equals(
                        appointment.getDoctor().getId())) {
            throw new AccessDeniedException(
                    "You cannot access another doctor's consultation");
        }
    }

    private Appointment getAppointment(
            Long appointmentId,
            Authentication authentication) {

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment not found with ID: " + appointmentId));

        checkDoctorAppointmentAccess(appointment, authentication);

        return appointment;
    }

    private Appointment getCompletedAppointment(
            Long appointmentId,
            Authentication authentication) {

        Appointment appointment = getAppointment(
                appointmentId, authentication);

        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "Medical records can only be created for completed appointments");
        }

        return appointment;
    }

    private void validateFollowUpDate(LocalDate followUpDate) {
        if (followUpDate != null
                && followUpDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "Follow-up date cannot be in the past");
        }
    }

    private void validatePatientMatchesAppointment(
            MedicalRecord request,
            Appointment appointment) {

        if (request.getPatient() == null
                || request.getPatient().getId() == null
                || appointment.getPatient() == null
                || !request.getPatient().getId().equals(
                        appointment.getPatient().getId())) {
            throw new IllegalArgumentException(
                    "Patient must match the selected appointment");
        }
    }

    private void validateAppointmentMatchesRequest(
            MedicalRecord request,
            Long appointmentId) {

        if (request.getAppointment() == null
                || request.getAppointment().getId() == null
                || !appointmentId.equals(
                        request.getAppointment().getId())) {
            throw new IllegalArgumentException(
                    "Appointment ID in the request must match the URL");
        }
    }

    private MedicalRecord buildRecord(
            MedicalRecord request,
            Appointment appointment) {

        MedicalRecord record = new MedicalRecord();
        record.setAppointment(appointment);
        record.setPatient(appointment.getPatient());
        record.setSymptoms(request.getSymptoms());
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatment(request.getTreatment());
        record.setPrescription(request.getPrescription());
        record.setVisitDate(
                appointment.getAppointmentDateTime().toLocalDate());
        record.setFollowUpDate(request.getFollowUpDate());

        validateFollowUpDate(record.getFollowUpDate());

        return record;
    }

    /**
     * Creates a medical record for an appointment that is already completed.
     * Retained for the existing POST /api/medical-records endpoint.
     */
    @Transactional
    public MedicalRecord createMedicalRecord(
            MedicalRecord request,
            Authentication authentication) {

        if (request.getAppointment() == null
                || request.getAppointment().getId() == null) {
            throw new IllegalArgumentException("Appointment ID is required");
        }

        Long appointmentId = request.getAppointment().getId();

        Appointment appointment = getCompletedAppointment(
                appointmentId, authentication);

        validatePatientMatchesAppointment(request, appointment);

        if (medicalRecordRepository.existsByAppointmentId(appointmentId)) {
            throw new IllegalArgumentException(
                    "A medical record already exists for this appointment");
        }

        return medicalRecordRepository.save(
                buildRecord(request, appointment));
    }

    /**
     * Atomically saves a medical record and marks its booked appointment
     * as completed. Any failure rolls back both changes.
     */
    @Transactional
    public MedicalRecord completeAppointmentWithRecord(
            Long appointmentId,
            MedicalRecord request,
            Authentication authentication) {

        Appointment appointment = getAppointment(
                appointmentId, authentication);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Cancelled appointments cannot be completed");
        }

        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "Appointment is already completed");
        }

        validateAppointmentMatchesRequest(request, appointmentId);
        validatePatientMatchesAppointment(request, appointment);

        if (medicalRecordRepository.existsByAppointmentId(appointmentId)) {
            throw new IllegalArgumentException(
                    "A medical record already exists for this appointment");
        }

        MedicalRecord record = buildRecord(request, appointment);

        /*
         * Save the record first. If saving fails, the transaction rolls back.
         * Then change the appointment status within the same transaction.
         */
        MedicalRecord savedRecord = medicalRecordRepository.saveAndFlush(record);

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointmentRepository.save(appointment);

        return savedRecord;
    }

    public List<MedicalRecord> getAllMedicalRecords() {
        return medicalRecordRepository.findAll();
    }

    public MedicalRecord getMedicalRecordById(
            Long id,
            Authentication authentication) {

        MedicalRecord record = findMedicalRecord(id);

        checkDoctorAppointmentAccess(
                record.getAppointment(), authentication);

        return record;
    }

    public List<MedicalRecord> getMedicalRecordsByPatient(
            Long patientId,
            Authentication authentication) {

        if (!patientRepository.existsById(patientId)) {
            throw new ResourceNotFoundException(
                    "Patient not found with ID: " + patientId);
        }

        User user = getUser(authentication);

        if (user.getRole() == UserRole.DOCTOR) {
            if (user.getDoctor() == null) {
                throw new AccessDeniedException(
                        "No doctor profile is linked to this account");
            }

            boolean hasAppointment =
                    appointmentRepository.existsByDoctorIdAndPatientId(
                            user.getDoctor().getId(), patientId);

            if (!hasAppointment) {
                throw new AccessDeniedException(
                        "You cannot access this patient's records");
            }
        }

        return medicalRecordRepository.findByPatientId(patientId);
    }

    @Transactional
    public MedicalRecord updateMedicalRecord(
            Long id,
            MedicalRecord request,
            Authentication authentication) {

        MedicalRecord existing = findMedicalRecord(id);

        checkDoctorAppointmentAccess(
                existing.getAppointment(), authentication);

        if (request.getAppointment() != null
                && request.getAppointment().getId() != null
                && !request.getAppointment().getId().equals(
                        existing.getAppointment().getId())) {
            throw new IllegalArgumentException(
                    "A medical record cannot be moved to another appointment");
        }

        if (request.getPatient() != null
                && request.getPatient().getId() != null
                && !request.getPatient().getId().equals(
                        existing.getPatient().getId())) {
            throw new IllegalArgumentException(
                    "A medical record cannot be moved to another patient");
        }

        existing.setSymptoms(request.getSymptoms());
        existing.setDiagnosis(request.getDiagnosis());
        existing.setTreatment(request.getTreatment());
        existing.setPrescription(request.getPrescription());
        existing.setFollowUpDate(request.getFollowUpDate());

        validateFollowUpDate(existing.getFollowUpDate());

        return medicalRecordRepository.save(existing);
    }

    @Transactional
    public void deleteMedicalRecord(Long id) {
        MedicalRecord record = findMedicalRecord(id);
        medicalRecordRepository.delete(record);
    }

    private MedicalRecord findMedicalRecord(Long id) {
        return medicalRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Medical record not found with ID: " + id));
    }
}
