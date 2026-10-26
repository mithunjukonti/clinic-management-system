package com.clinic.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.clinic.entity.Invoice;
import com.clinic.entity.InvoiceStatus;
import com.clinic.service.InvoiceService;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping
    public ResponseEntity<Invoice> generateInvoice(
            @RequestParam Long appointmentId,
            @RequestParam BigDecimal consultationFee) {

        Invoice invoice = invoiceService.generateInvoice(
                appointmentId, consultationFee);

        return ResponseEntity.status(HttpStatus.CREATED).body(invoice);
    }

    @GetMapping
    public ResponseEntity<List<Invoice>> getAllInvoices(
            @RequestParam(required = false) Long patientId,
            @RequestParam(required = false) InvoiceStatus status) {

        if (patientId != null) {
            return ResponseEntity.ok(
                    invoiceService.getInvoicesByPatient(patientId));
        }

        if (status != null) {
            return ResponseEntity.ok(
                    invoiceService.getInvoicesByStatus(status));
        }

        return ResponseEntity.ok(invoiceService.getAllInvoices());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Invoice> updateInvoiceStatus(
            @PathVariable Long id,
            @RequestParam InvoiceStatus status) {

        return ResponseEntity.ok(
                invoiceService.updateInvoiceStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        // Deletion is intentionally not supported by the service.
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).build();
    }
}