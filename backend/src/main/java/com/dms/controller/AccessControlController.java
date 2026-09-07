package com.dms.controller;

import com.dms.dto.AccessControlDTOs.*;
import com.dms.service.AccessControlService;
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
@RequestMapping("/api/access")
@Tag(name = "AccessControl", description = "Endpoints for managing document sharing and user permissions")
public class AccessControlController {

    private final AccessControlService accessControlService;

    public AccessControlController(AccessControlService accessControlService) {
        this.accessControlService = accessControlService;
    }

    @PostMapping("/{documentId}/grant")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','ADMIN')")
    @Operation(summary = "Grant document permission to a user")
    public ResponseEntity<AccessControlResponse> grant(
            @PathVariable("documentId") Long documentId,
            @Valid @RequestBody GrantAccessRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AccessControlResponse response = accessControlService.grant(documentId, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{documentId}/revoke")
    @PreAuthorize("hasAnyRole('DOCUMENT_OWNER','ADMIN')")
    @Operation(summary = "Revoke document permission from a user")
    public ResponseEntity<Void> revoke(
            @PathVariable("documentId") Long documentId,
            @Valid @RequestBody RevokeAccessRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        accessControlService.revoke(documentId, request, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all permission mappings for a document")
    public ResponseEntity<List<AccessControlResponse>> list(@PathVariable("documentId") Long documentId) {
        List<AccessControlResponse> response = accessControlService.list(documentId);
        return ResponseEntity.ok(response);
    }
}
