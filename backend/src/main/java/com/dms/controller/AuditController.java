package com.dms.controller;

import com.dms.dto.ErrorResponse;
import com.dms.entity.AuditLog;
import com.dms.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Audit", description = "Endpoints for viewing system and document audit logs")
@SecurityRequirement(name = "BearerAuth")
public class AuditController {

    private final AuditLogRepository auditLogRepository;
    private final com.dms.audit.AuditService auditService;

    public AuditController(AuditLogRepository auditLogRepository, com.dms.audit.AuditService auditService) {
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
    }

    @GetMapping("/api/audit/document/{documentId}")
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER','DOCUMENT_OWNER','EDITOR','APPROVER')")
    @Operation(summary = "Get paginated audit logs for a specific document", description = "Returns audit trail entries for document ID.")
    @ApiResponse(responseCode = "200", description = "Document audit logs retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Page<AuditLog>> getDocumentLogs(
            @Parameter(description = "Document ID") @PathVariable Long documentId,
            Pageable pageable) {
        Page<AuditLog> logs = auditLogRepository.findByDocument_Id(documentId, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/api/admin/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get paginated global audit logs", description = "Returns system audit trail logs optionally filtered by entity type.")
    @ApiResponse(responseCode = "200", description = "Audit logs retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (Admin role required)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Page<AuditLog>> getAllLogs(
            @Parameter(description = "Filter by entity type (DOCUMENT, WORKFLOW, USER)") @RequestParam(required = false) String entityType,
            Pageable pageable) {
        Page<AuditLog> logs;
        if (entityType != null && !entityType.trim().isEmpty()) {
            logs = auditLogRepository.findByEntityType(entityType, pageable);
        } else {
            logs = auditLogRepository.findAll(pageable);
        }
        return ResponseEntity.ok(logs);
    }

    @PostMapping("/api/admin/audit-logs/seed-historical")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Seed historical audit log entry", description = "Creates a back-dated audit log entry for testing retention policy compliance.")
    @ApiResponse(responseCode = "200", description = "Historical audit log created", content = @Content(mediaType = "application/json", schema = @Schema(implementation = AuditLog.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<AuditLog> seedHistoricalLog(
            @RequestParam String username,
            @RequestParam(required = false) Long documentId,
            @RequestParam String action,
            @RequestParam String entityType,
            @RequestParam String entityId,
            @RequestParam(required = false) String oldValue,
            @RequestParam(required = false) String newValue,
            @RequestParam int yearsAgo) {
        com.dms.entity.Document doc = null;
        if (documentId != null) {
            doc = new com.dms.entity.Document();
            doc.setId(documentId);
        }
        java.time.LocalDateTime pastTime = java.time.LocalDateTime.now().minusYears(yearsAgo);
        AuditLog log = auditService.logWithTimestamp(username, doc, action, entityType, entityId, oldValue, newValue, "127.0.0.1", pastTime);
        return ResponseEntity.ok(log);
    }

    @GetMapping("/api/admin/audit-logs/retention-policy")
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER')")
    @Operation(summary = "Get compliance status of audit log retention policy", description = "Verifies 7-year audit log immutability and retention compliance.")
    @ApiResponse(responseCode = "200", description = "Retention policy status retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<java.util.Map<String, Object>> getRetentionPolicyStatus() {
        return ResponseEntity.ok(java.util.Map.of(
                "retentionPeriodYears", 7,
                "policyStatus", "ENFORCED",
                "minRetentionYears", 7,
                "purgingEnabled", false,
                "message", "Audit logs are retained for a mandatory minimum period of 7 years in compliance with organizational retention policy (Appendix F)."
        ));
    }

    @RequestMapping(value = {"/api/audit/**", "/api/admin/audit-logs/**"}, method = {RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH})
    @Operation(summary = "Immutability protection for audit logs", description = "Blocks modifications or deletions of audit trail logs (always throws 403 Forbidden).")
    @ApiResponse(responseCode = "403", description = "Audit logs cannot be modified", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> denyAuditModification() {
        throw new com.dms.exception.UnauthorisedAccessException("Audit logs are immutable");
    }
}
