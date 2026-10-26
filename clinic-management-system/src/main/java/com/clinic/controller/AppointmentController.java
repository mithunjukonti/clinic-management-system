
package com.clinic.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.clinic.entity.Appointment;
import com.clinic.service.AppointmentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(
            AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    private boolean hasRole(
            Authentication authentication, String role) {

        return authentication != null
                && authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(authority ->
                                authority.equals("ROLE_" + role));
    }

    private void requireStaffOrAdmin(Authentication authentication) {
        if (!hasRole(authentication, "ADMIN")
                && !hasRole(authentication, "STAFF")) {
            throw new AccessDeniedException(
                    "Only staff or administrators can perform this action");
        }
    }

    private Long verifyDoctorOwnership(
            Long appointmentId,
            Authentication authentication) {

        if (!hasRole(authentication, "DOCTOR")) {
            return null;
        }

        Long linkedDoctorId =
                appointmentService.getLinkedDoctorId(
                        authentication.getName());

        Appointment appointment =
                appointmentService.getAppointmentById(appointmentId);

        if (appointment.getDoctor() == null
                || !linkedDoctorId.equals(
                        appointment.getDoctor().getId())) {
            throw new AccessDeniedException(
                    "You cannot access another doctor's appointment");
        }

        return linkedDoctorId;
    }

    @PostMapping
    public ResponseEntity<Appointment> bookAppointment(
            @Valid @RequestBody Appointment appointment,
            Authentication authentication) {

        requireStaffOrAdmin(authentication);

        Appointment saved =
                appointmentService.bookAppointment(appointment);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments(
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long patientId,
            Authentication authentication) {

        if (hasRole(authentication, "DOCTOR")) {
            Long linkedDoctorId =
                    appointmentService.getLinkedDoctorId(
                            authentication.getName());

            if (doctorId != null && !doctorId.equals(linkedDoctorId)) {
                throw new AccessDeniedException(
                        "You cannot access another doctor's appointments");
            }

            List<Appointment> appointments =
                    appointmentService.getAppointmentsByDoctor(
                            linkedDoctorId);

            if (patientId != null) {
                appointments = appointments.stream()
                        .filter(appointment ->
                                appointment.getPatient() != null
                                && patientId.equals(
                                        appointment.getPatient().getId()))
                        .toList();
            }

            return ResponseEntity.ok(appointments);
        }

        if (doctorId != null) {
            return ResponseEntity.ok(
                    appointmentService.getAppointmentsByDoctor(doctorId));
        }

        if (patientId != null) {
            return ResponseEntity.ok(
                    appointmentService.getAppointmentsByPatient(patientId));
        }

        return ResponseEntity.ok(
                appointmentService.getAllAppointments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(
            @PathVariable Long id,
            Authentication authentication) {

        verifyDoctorOwnership(id, authentication);

        return ResponseEntity.ok(
                appointmentService.getAppointmentById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Appointment> updateAppointment(
            @PathVariable Long id,
            @Valid @RequestBody Appointment appointment,
            Authentication authentication) {

        verifyDoctorOwnership(id, authentication);

        if (hasRole(authentication, "DOCTOR")) {
            throw new AccessDeniedException(
                    "Doctors cannot update appointments through this endpoint");
        }

        requireStaffOrAdmin(authentication);

        return ResponseEntity.ok(
                appointmentService.updateAppointment(id, appointment));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Appointment> cancelAppointment(
            @PathVariable Long id,
            Authentication authentication) {

        requireStaffOrAdmin(authentication);

        return ResponseEntity.ok(
                appointmentService.cancelAppointment(id));
    }

    /**
     * Direct completion is disabled so doctors must create the medical
     * record and complete the appointment in one transaction.
     */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<String> completeAppointment(
            @PathVariable Long id,
            Authentication authentication) {

        if (!hasRole(authentication, "DOCTOR")) {
            throw new AccessDeniedException(
                    "Only doctors can complete appointments");
        }

        verifyDoctorOwnership(id, authentication);

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body("Create the medical record using "
                        + "POST /api/medical-records/complete-appointment/"
                        + id
                        + " to complete this consultation.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteAppointment(
            @PathVariable Long id,
            Authentication authentication) {

        requireStaffOrAdmin(authentication);

        appointmentService.deleteAppointment(id);

        return ResponseEntity.ok(
                "Appointment deleted successfully");
    }
}
