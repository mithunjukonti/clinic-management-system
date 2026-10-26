
package com.clinic.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.clinic.entity.MedicalRecord;
import com.clinic.service.MedicalRecordService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/medical-records")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    public MedicalRecordController(
            MedicalRecordService medicalRecordService) {
        this.medicalRecordService = medicalRecordService;
    }

    private boolean hasRole(
            Authentication authentication, String role) {

        return authentication != null
                && authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(authority ->
                                authority.equals("ROLE_" + role));
    }

    private void requireAdmin(Authentication authentication) {
        if (!hasRole(authentication, "ADMIN")) {
            throw new AccessDeniedException(
                    "Only administrators can perform this operation");
        }
    }

    private void requireAdminOrDoctor(Authentication authentication) {
        if (!hasRole(authentication, "ADMIN")
                && !hasRole(authentication, "DOCTOR")) {
            throw new AccessDeniedException(
                    "Only administrators or doctors can access medical records");
        }
    }

    @PostMapping
    public ResponseEntity<MedicalRecord> createMedicalRecord(
            @Valid @RequestBody MedicalRecord medicalRecord,
            Authentication authentication) {

        requireAdminOrDoctor(authentication);

        MedicalRecord saved =
                medicalRecordService.createMedicalRecord(
                        medicalRecord, authentication);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Saves a medical record and completes its appointment in one
     * database transaction.
     */
    @PostMapping("/complete-appointment/{appointmentId}")
    public ResponseEntity<MedicalRecord> completeAppointmentWithRecord(
            @PathVariable Long appointmentId,
            @Valid @RequestBody MedicalRecord medicalRecord,
            Authentication authentication) {

        // This workflow is specifically for doctors.
        if (!hasRole(authentication, "DOCTOR")) {
            throw new AccessDeniedException(
                    "Only doctors can complete consultations with a medical record");
        }

        MedicalRecord saved =
                medicalRecordService.completeAppointmentWithRecord(
                        appointmentId, medicalRecord, authentication);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<MedicalRecord>> getAllMedicalRecords(
            Authentication authentication) {

        requireAdmin(authentication);

        return ResponseEntity.ok(
                medicalRecordService.getAllMedicalRecords());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecord> getMedicalRecordById(
            @PathVariable Long id,
            Authentication authentication) {

        requireAdminOrDoctor(authentication);

        return ResponseEntity.ok(
                medicalRecordService.getMedicalRecordById(
                        id, authentication));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<MedicalRecord>> getMedicalRecordsByPatient(
            @PathVariable Long patientId,
            Authentication authentication) {

        requireAdminOrDoctor(authentication);

        return ResponseEntity.ok(
                medicalRecordService.getMedicalRecordsByPatient(
                        patientId, authentication));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicalRecord> updateMedicalRecord(
            @PathVariable Long id,
            @Valid @RequestBody MedicalRecord medicalRecord,
            Authentication authentication) {

        requireAdminOrDoctor(authentication);

        return ResponseEntity.ok(
                medicalRecordService.updateMedicalRecord(
                        id, medicalRecord, authentication));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedicalRecord(
            @PathVariable Long id,
            Authentication authentication) {

        requireAdmin(authentication);

        medicalRecordService.deleteMedicalRecord(id);

        return ResponseEntity.noContent().build();
    }
}
