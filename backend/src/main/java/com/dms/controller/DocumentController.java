package com.dms.controller;

import com.dms.dto.DocumentDTOs.*;
import com.dms.service.DocumentService;
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
@RequestMapping("/api/documents")
@Tag(name = "Document", description = "Endpoints for uploading, updating, searching, and managing documents and their versions")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('EDITOR','DOCUMENT_OWNER','ADMIN')")
    @Operation(summary = "Upload a new document")
    public ResponseEntity<DocumentResponse> upload(
            @Valid @RequestBody DocumentUploadRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.upload(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search documents by title, status, and/or owner ID")
    public ResponseEntity<List<DocumentResponse>> search(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long ownerId) {
        List<DocumentResponse> response = documentService.search(title, status, ownerId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get document details by ID")
    public ResponseEntity<DocumentResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.getById(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get version history of a document")
    public ResponseEntity<List<DocumentVersionResponse>> getVersions(@PathVariable Long id) {
        List<DocumentVersionResponse> response = documentService.getVersions(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR','DOCUMENT_OWNER','ADMIN')")
    @Operation(summary = "Create a new version for an existing document")
    public ResponseEntity<DocumentResponse> createNewVersion(
            @PathVariable Long id,
            @Valid @RequestBody DocumentUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.createNewVersion(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','ADMIN')")
    @Operation(summary = "Soft delete an existing document")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        documentService.delete(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
