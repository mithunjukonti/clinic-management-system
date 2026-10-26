package com.clinic.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.clinic.entity.Appointment;
import com.clinic.entity.AppointmentStatus;
import com.clinic.entity.Invoice;
import com.clinic.entity.InvoiceStatus;
import com.clinic.entity.Patient;
import com.clinic.exception.ResourceNotFoundException;
import com.clinic.repository.AppointmentRepository;
import com.clinic.repository.InvoiceRepository;
import com.clinic.repository.PatientRepository;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          AppointmentRepository appointmentRepository,
                          PatientRepository patientRepository) {
        this.invoiceRepository = invoiceRepository;
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
    }

    @Transactional
    public Invoice generateInvoice(Long appointmentId, BigDecimal consultationFee) {

        if (appointmentId == null) {
            throw new IllegalArgumentException("Appointment ID is required");
        }

        if (consultationFee == null || consultationFee.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Consultation fee must be greater than zero");
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment not found with ID: " + appointmentId));

        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "Invoice can only be generated for completed appointments");
        }

        if (invoiceRepository.existsByAppointmentId(appointmentId)) {
            throw new IllegalArgumentException(
                    "An invoice already exists for this appointment");
        }

        Patient patient = patientRepository.findById(appointment.getPatient().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient not found with ID: " + appointment.getPatient().getId()));

        Invoice invoice = new Invoice();
        invoice.setPatient(patient);
        invoice.setAppointment(appointment);
        invoice.setConsultationFee(consultationFee);
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setStatus(InvoiceStatus.PENDING);

        return invoiceRepository.save(invoice);
    }

    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    public Invoice getInvoiceById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Invoice not found with ID: " + id));
    }

    public List<Invoice> getInvoicesByPatient(Long patientId) {
        if (!patientRepository.existsById(patientId)) {
            throw new ResourceNotFoundException(
                    "Patient not found with ID: " + patientId);
        }

        return invoiceRepository.findByPatientId(patientId);
    }

    public List<Invoice> getInvoicesByStatus(InvoiceStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Invoice status is required");
        }

        return invoiceRepository.findByStatus(status);
    }

    @Transactional
    public Invoice updateInvoiceStatus(Long id, InvoiceStatus status) {
        Invoice invoice = getInvoiceById(id);

        if (status == null) {
            throw new IllegalArgumentException("Invoice status is required");
        }

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Cancelled invoices cannot be updated");
        }

        if (invoice.getStatus() == InvoiceStatus.PAID
                && status != InvoiceStatus.PAID) {
            throw new IllegalArgumentException(
                    "Paid invoices cannot be changed to another status");
        }

        invoice.setStatus(status);
        return invoiceRepository.save(invoice);
    }
}