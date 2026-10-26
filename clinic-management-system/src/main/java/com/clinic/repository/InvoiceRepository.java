package com.clinic.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.clinic.entity.Invoice;
import com.clinic.entity.InvoiceStatus;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByPatientId(Long patientId);

    boolean existsByAppointmentId(Long appointmentId);

    List<Invoice> findByStatus(InvoiceStatus status);
}