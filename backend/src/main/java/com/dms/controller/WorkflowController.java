package com.dms.controller;

import com.dms.dto.ErrorResponse;
import com.dms.dto.WorkflowDTOs.*;
import com.dms.service.WorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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
@SecurityRequirement(name = "BearerAuth")
public class WorkflowController {

    private final WorkflowService workflowService;

    public WorkflowController(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @PostMapping("/{documentId}/start")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','ADMIN','COMPLIANCE_OFFICER','OFFICER','MANAGER','SUPERVISOR','OWNER')")
    @Operation(summary = "Initiate an approval workflow for a document", description = "Submits document for review by an assigned approver with due date and comment.")
    @ApiResponse(responseCode = "200", description = "Workflow initiated successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = WorkflowResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user lacks initiate permissions)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Workflow already pending for this document", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<WorkflowResponse> initiate(
            @Parameter(description = "Document ID") @PathVariable("documentId") Long documentId,
            @Valid @RequestBody WorkflowInitiateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        request.setDocumentId(documentId);
        WorkflowResponse response = workflowService.initiate(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Get list of all workflows", description = "Returns list of all workflows accessible to authenticated user.")
    @ApiResponse(responseCode = "200", description = "Workflows retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<WorkflowResponse>> getAll(@AuthenticationPrincipal UserDetails userDetails) {
        List<WorkflowResponse> response = workflowService.getAll(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Get list of all pending workflows", description = "Returns list of pending workflows awaiting approval decision.")
    @ApiResponse(responseCode = "200", description = "Pending workflows retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<WorkflowResponse>> getPending(@AuthenticationPrincipal UserDetails userDetails) {
        List<WorkflowResponse> response = workflowService.getPending(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Approve a pending workflow", description = "Approves workflow decision with optional note and digital signature. Updates document status to APPROVED.")
    @ApiResponse(responseCode = "200", description = "Workflow approved successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = WorkflowResponse.class)))
    @ApiResponse(responseCode = "400", description = "Workflow not pending or missing signature", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user is not assigned approver/admin)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Workflow not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<WorkflowResponse> approve(
            @Parameter(description = "Workflow ID") @PathVariable Long id,
            @RequestBody WorkflowDecisionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        WorkflowResponse response = workflowService.approve(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Reject a pending workflow", description = "Rejects workflow decision with required rejection reason. Reverts document status to DRAFT.")
    @ApiResponse(responseCode = "200", description = "Workflow rejected successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = WorkflowResponse.class)))
    @ApiResponse(responseCode = "400", description = "Missing rejection reason or workflow not pending", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user is not assigned approver/admin)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Workflow not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<WorkflowResponse> reject(
            @Parameter(description = "Workflow ID") @PathVariable Long id,
            @RequestBody WorkflowDecisionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        WorkflowResponse response = workflowService.reject(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','ADMIN','COMPLIANCE_OFFICER','OFFICER','MANAGER','SUPERVISOR','OWNER')")
    @Operation(summary = "Initiate an approval workflow for a document (Direct body endpoint)", description = "Direct body initiate endpoint.")
    @ApiResponse(responseCode = "200", description = "Workflow initiated successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = WorkflowResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Workflow already pending for this document", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<WorkflowResponse> initiateDirect(
            @Valid @RequestBody WorkflowInitiateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        WorkflowResponse response = workflowService.initiate(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/approvers")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of eligible approvers", description = "Returns users with APPROVER, MANAGER, or ADMIN roles.")
    @ApiResponse(responseCode = "200", description = "Eligible approvers retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<com.dms.entity.Users>> getEligibleApprovers() {
        return ResponseEntity.ok(workflowService.getEligibleApprovers());
    }

    @GetMapping("/{documentId}/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get the workflow decision history of a document", description = "Returns workflow progression timeline for document ID.")
    @ApiResponse(responseCode = "200", description = "Workflow history retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<WorkflowResponse>> getHistory(@Parameter(description = "Document ID") @PathVariable Long documentId) {
        List<WorkflowResponse> response = workflowService.getHistory(documentId);
        return ResponseEntity.ok(response);
    }
}
