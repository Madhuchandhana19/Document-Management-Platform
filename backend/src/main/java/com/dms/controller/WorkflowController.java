package com.dms.controller;

import com.dms.dto.WorkflowDTOs.*;
import com.dms.service.WorkflowService;
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
@RequestMapping("/api/workflows")
@Tag(name = "Workflow", description = "Endpoints for initiating and managing document approval workflows")
public class WorkflowController {

    private final WorkflowService workflowService;

    public WorkflowController(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @PostMapping("/{documentId}/start")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','ADMIN')")
    @Operation(summary = "Initiate an approval workflow for a document")
    public ResponseEntity<WorkflowResponse> initiate(
            @PathVariable("documentId") Long documentId,
            @Valid @RequestBody WorkflowInitiateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ensure request has the correct documentId from path
        request.setDocumentId(documentId);
        WorkflowResponse response = workflowService.initiate(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Get list of all workflows")
    public ResponseEntity<List<WorkflowResponse>> getAll(@AuthenticationPrincipal UserDetails userDetails) {
        List<WorkflowResponse> response = workflowService.getAll(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Get list of all pending workflows")
    public ResponseEntity<List<WorkflowResponse>> getPending(@AuthenticationPrincipal UserDetails userDetails) {
        List<WorkflowResponse> response = workflowService.getPending(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")
    @Operation(summary = "Approve a pending workflow")
    public ResponseEntity<WorkflowResponse> approve(
            @PathVariable Long id,
            @RequestBody WorkflowDecisionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        WorkflowResponse response = workflowService.approve(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")
    @Operation(summary = "Reject a pending workflow")
    public ResponseEntity<WorkflowResponse> reject(
            @PathVariable Long id,
            @RequestBody WorkflowDecisionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        WorkflowResponse response = workflowService.reject(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{documentId}/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get the workflow decision history of a document")
    public ResponseEntity<List<WorkflowResponse>> getHistory(@PathVariable Long documentId) {
        List<WorkflowResponse> response = workflowService.getHistory(documentId);
        return ResponseEntity.ok(response);
    }
}
