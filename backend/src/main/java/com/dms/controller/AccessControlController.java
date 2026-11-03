package com.dms.controller;

import com.dms.dto.AccessControlDTOs.*;
import com.dms.dto.ErrorResponse;
import com.dms.service.AccessControlService;
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
@RequestMapping("/api/access")
@Tag(name = "AccessControl", description = "Endpoints for managing document sharing and user permissions")
@SecurityRequirement(name = "BearerAuth")
public class AccessControlController {

    private final AccessControlService accessControlService;

    public AccessControlController(AccessControlService accessControlService) {
        this.accessControlService = accessControlService;
    }

    @PostMapping("/{documentId}/grant")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Grant document permission to a user", description = "Grants VIEW, EDIT, APPROVE, or MANAGE permission to a specified target user for a document.")
    @ApiResponse(responseCode = "200", description = "Permission granted successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = AccessControlResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid request parameters or target user not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (user lacks permission management rights)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<AccessControlResponse> grant(
            @Parameter(description = "Document ID") @PathVariable("documentId") Long documentId,
            @Valid @RequestBody GrantAccessRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AccessControlResponse response = accessControlService.grant(documentId, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{documentId}/revoke")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','EDITOR','APPROVER','ADMIN')")
    @Operation(summary = "Revoke document permission from a user", description = "Revokes access permission from target user for specified document.")
    @ApiResponse(responseCode = "204", description = "Permission revoked successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document or permission record not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> revoke(
            @Parameter(description = "Document ID") @PathVariable("documentId") Long documentId,
            @Valid @RequestBody RevokeAccessRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        accessControlService.revoke(documentId, request, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all permission mappings for a document", description = "Returns active permission ACL list for document.")
    @ApiResponse(responseCode = "200", description = "Permissions list retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Document not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<AccessControlResponse>> list(@Parameter(description = "Document ID") @PathVariable("documentId") Long documentId) {
        List<AccessControlResponse> response = accessControlService.list(documentId);
        return ResponseEntity.ok(response);
    }
}
