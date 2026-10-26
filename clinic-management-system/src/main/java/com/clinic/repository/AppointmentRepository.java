package com.clinic.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.clinic.entity.Appointment;

@Repository
public interface AppointmentRepository
        extends JpaRepository<Appointment, Long> {

    List<Appointment> findByDoctorId(Long doctorId);

    List<Appointment> findByPatientId(Long patientId);

    boolean existsByDoctorIdAndAppointmentDateTimeAndStatusNot(
            Long doctorId,
            LocalDateTime appointmentDateTime,
            com.clinic.entity.AppointmentStatus status);
    
    boolean existsByDoctorIdAndPatientId(Long doctorId, Long patientId);
}