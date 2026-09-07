package com.dms.controller;

import com.dms.dto.RetentionDTOs.RetentionPolicyRequest;
import com.dms.dto.SystemHealth;
import com.dms.dto.UploadTrend;
import com.dms.dto.WorkflowAnalytics;
import com.dms.dto.DocumentDTOs.DocumentResponse;
import com.dms.service.AnalyticsService;
import com.dms.service.RetentionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Tag(name = "Admin & Analytics", description = "Endpoints for administrators and compliance officers to monitor system health and analytics")
public class AdminController {

    private final AnalyticsService analyticsService;
    private final RetentionService retentionService;

    public AdminController(AnalyticsService analyticsService, RetentionService retentionService) {
        this.analyticsService = analyticsService;
        this.retentionService = retentionService;
    }

    @GetMapping("/api/admin/system-health")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get system statistics and operational status")
    public ResponseEntity<SystemHealth> getSystemHealth() {
        SystemHealth health = analyticsService.getSystemHealth();
        return ResponseEntity.ok(health);
    }

    @GetMapping("/api/admin/analytics/uploads")
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER')")
    @Operation(summary = "Get upload trends grouped by date")
    public ResponseEntity<List<UploadTrend>> getUploadTrends() {
        List<UploadTrend> trends = analyticsService.getUploadTrends();
        return ResponseEntity.ok(trends);
    }

    @GetMapping("/api/admin/analytics/workflows")
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER')")
    @Operation(summary = "Get workflow execution metrics and performance analytics")
    public ResponseEntity<List<WorkflowAnalytics>> getWorkflowAnalytics() {
        List<WorkflowAnalytics> metrics = analyticsService.getWorkflowAnalytics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/api/retention/upcoming")
    @PreAuthorize("hasAnyRole('ADMIN','COMPLIANCE_OFFICER','DOCUMENT_OWNER')")
    @Operation(summary = "Get upcoming documents approaching their retention expiration dates")
    public ResponseEntity<List<DocumentResponse>> getUpcoming(
            @RequestParam(defaultValue = "30") int daysAhead) {
        List<DocumentResponse> upcoming = retentionService.getUpcoming(daysAhead);
        return ResponseEntity.ok(upcoming);
    }

    @PostMapping("/api/retention/policy")
    @PreAuthorize("hasAnyRole('ADMIN','DOCUMENT_OWNER')")
    @Operation(summary = "Define or update a retention date policy for a document")
    public ResponseEntity<Void> setPolicy(
            @Valid @RequestBody RetentionPolicyRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        retentionService.setPolicy(request.getDocumentId(), request.getRetentionDate(), userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}
