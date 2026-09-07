package com.dms.controller;

import com.dms.entity.AuditLog;
import com.dms.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Audit", description = "Endpoints for viewing system and document audit logs")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/api/audit/document/{documentId}")
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER')")
    @Operation(summary = "Get paginated audit logs for a specific document")
    public ResponseEntity<Page<AuditLog>> getDocumentLogs(
            @PathVariable Long documentId,
            Pageable pageable) {
        Page<AuditLog> logs = auditLogRepository.findByDocument_Id(documentId, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/api/admin/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get paginated global audit logs, optionally filtered by entity type")
    public ResponseEntity<Page<AuditLog>> getAllLogs(
            @RequestParam(required = false) String entityType,
            Pageable pageable) {
        Page<AuditLog> logs;
        if (entityType != null && !entityType.trim().isEmpty()) {
            logs = auditLogRepository.findByEntityType(entityType, pageable);
        } else {
            logs = auditLogRepository.findAll(pageable);
        }
        return ResponseEntity.ok(logs);
    }
}
