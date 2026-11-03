package com.dms.controller;

import com.dms.dto.DocumentDTOs.*;
import com.dms.dto.ErrorResponse;
import com.dms.service.DocumentService;
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
@RequestMapping("/api/documents")
@Tag(name = "Document", description = "Endpoints for uploading, updating, searching, and managing documents and their versions")
@SecurityRequirement(name = "BearerAuth")
public class DocumentController {

    private final DocumentService documentService;
    private final com.dms.service.AccessControlService accessControlService;

    public DocumentController(DocumentService documentService, com.dms.service.AccessControlService accessControlService) {
        this.documentService = documentService;
        this.accessControlService = accessControlService;
    }

    @PostMapping("/{id}/access")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Grant document permission to a user", description = "Grants VIEW, EDIT, APPROVE, or MANAGE permission to a specified user for a document.")
    @ApiResponse(responseCode = "200", description = "Access permission granted successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = com.dms.dto.AccessControlDTOs.AccessControlResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden permission grant attempt", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<com.dms.dto.AccessControlDTOs.AccessControlResponse> grantAccess(
            @Parameter(description = "ID of target document") @PathVariable("id") Long id,
            @Valid @RequestBody com.dms.dto.AccessControlDTOs.GrantAccessRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        com.dms.dto.AccessControlDTOs.AccessControlResponse response = accessControlService.grant(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','ADMIN','MANAGER','SUPERVISOR','OFFICER','OWNER','COMPLIANCE_OFFICER')")
    @Operation(summary = "Upload a new document", description = "Upload document with metadata (Title, Category, Access Level, Retention Period). Requires EDITOR or OWNER role.")
    @ApiResponse(responseCode = "200", description = "Document uploaded successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = DocumentResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid request (missing fields, file size exceeds 50MB)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized (missing or invalid token)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (insufficient permissions)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Duplicate document content detected", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<DocumentResponse> upload(
            @Valid @RequestBody DocumentUploadRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.upload(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of documents with optional pagination", description = "Retrieves non-archived accessible documents with filtering and pagination.")
    @ApiResponse(responseCode = "200", description = "Documents retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<?> getAll(
            @Parameter(description = "Filter by title substring") @RequestParam(required = false) String title,
            @Parameter(description = "Filter by document status") @RequestParam(required = false) String status,
            @Parameter(description = "Filter by document owner ID") @RequestParam(required = false) Long ownerId,
            @Parameter(description = "Page number (1-based index)") @RequestParam(required = false) Integer page,
            @Parameter(description = "Number of items per page") @RequestParam(required = false) Integer pageSize,
            @Parameter(description = "Page size alias") @RequestParam(required = false) Integer size,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : null;
        Integer effectiveSize = pageSize != null ? pageSize : size;
        if (page != null || effectiveSize != null) {
            return ResponseEntity.ok(documentService.searchPaginated(title, status, ownerId, page, effectiveSize, username));
        }
        return ResponseEntity.ok(documentService.search(title, status, ownerId, username));
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search documents by title, status, and/or owner ID with optional pagination", description = "Full text and metadata filter query endpoint.")
    @ApiResponse(responseCode = "200", description = "Search query executed successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<?> search(
            @Parameter(description = "Filter by title substring") @RequestParam(required = false) String title,
            @Parameter(description = "Filter by document status") @RequestParam(required = false) String status,
            @Parameter(description = "Filter by document owner ID") @RequestParam(required = false) Long ownerId,
            @Parameter(description = "Page number (1-based index)") @RequestParam(required = false) Integer page,
            @Parameter(description = "Number of items per page") @RequestParam(required = false) Integer pageSize,
            @Parameter(description = "Page size alias") @RequestParam(required = false) Integer size,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : null;
        Integer effectiveSize = pageSize != null ? pageSize : size;
        if (page != null || effectiveSize != null) {
            return ResponseEntity.ok(documentService.searchPaginated(title, status, ownerId, page, effectiveSize, username));
        }
        return ResponseEntity.ok(documentService.search(title, status, ownerId, username));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get document details by ID", description = "Retrieves document metadata, current version, and status by ID.")
    @ApiResponse(responseCode = "200", description = "Document details retrieved successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = DocumentResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user lacks view access)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<DocumentResponse> getById(
            @Parameter(description = "Document ID") @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.getById(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get version history of a document", description = "Returns chronological version history list for specified document ID.")
    @ApiResponse(responseCode = "200", description = "Version history retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<DocumentVersionResponse>> getVersions(@Parameter(description = "Document ID") @PathVariable Long id) {
        List<DocumentVersionResponse> response = documentService.getVersions(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new version for an existing document", description = "Uploads a new file version for an existing document, auto-incrementing the version number.")
    @ApiResponse(responseCode = "200", description = "New version created successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = DocumentResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user lacks EDIT permission or document is ARCHIVED)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<DocumentResponse> createNewVersion(
            @Parameter(description = "Document ID") @PathVariable Long id,
            @Valid @RequestBody DocumentUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.createNewVersion(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/metadata")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update document metadata", description = "Updates title, category, access level, and retention period years for specified document.")
    @ApiResponse(responseCode = "200", description = "Document metadata updated successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = DocumentResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid metadata values", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user lacks EDIT permission or document is ARCHIVED)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<DocumentResponse> updateMetadata(
            @Parameter(description = "Document ID") @PathVariable Long id,
            @Valid @RequestBody DocumentMetadataUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.updateMetadata(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/rollback/{targetVersionNo}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Rollback document to a previous version", description = "Reverts document content to a target historical version by creating a new version.")
    @ApiResponse(responseCode = "200", description = "Rollback completed successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = DocumentResponse.class)))
    @ApiResponse(responseCode = "400", description = "Target version does not exist", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user lacks EDIT permission)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<DocumentResponse> rollback(
            @Parameter(description = "Document ID") @PathVariable Long id,
            @Parameter(description = "Target historical version number") @PathVariable Integer targetVersionNo,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.rollback(id, targetVersionNo, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Download document content", description = "Logs a download audit trail entry and returns document download response.")
    @ApiResponse(responseCode = "200", description = "Download initiated successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = DocumentResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<DocumentResponse> download(
            @Parameter(description = "Document ID") @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.download(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/export-pdf")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Export document summary to PDF format", description = "Generates and returns downloadable PDF document summary report.")
    @ApiResponse(responseCode = "200", description = "PDF report generated successfully", content = @Content(mediaType = "application/pdf"))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<byte[]> exportPdf(
            @Parameter(description = "Document ID") @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        byte[] pdfBytes = documentService.exportPdf(id, userDetails.getUsername());
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"document_" + id + "_export.pdf\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Soft delete an existing document", description = "Marks document status as DELETED. Only document owner or admin can perform deletion.")
    @ApiResponse(responseCode = "204", description = "Document deleted successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user is not owner/admin or doc is ARCHIVED)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> delete(
            @Parameter(description = "Document ID") @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        documentService.delete(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
