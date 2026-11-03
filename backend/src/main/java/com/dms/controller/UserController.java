package com.dms.controller;

import com.dms.dto.ErrorResponse;
import com.dms.entity.Users;
import com.dms.repository.UserRepository;
import com.dms.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Endpoints for managing user accounts and GDPR compliance")
@SecurityRequirement(name = "BearerAuth")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get list of all registered users", description = "Returns user account registry. Requires ADMIN role.")
    @ApiResponse(responseCode = "200", description = "Users list retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (Admin role required)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<Users>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @RequestMapping(value = {"/{id}", "/{id}/gdpr-forget"}, method = {RequestMethod.DELETE, RequestMethod.POST})
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "GDPR-compliant user data deletion", description = "Permanently deletes user account and purges personal data in compliance with GDPR. Requires ADMIN role.")
    @ApiResponse(responseCode = "200", description = "User data purged successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden (Admin role required)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "User not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Map<String, Object>> deleteUser(
            @Parameter(description = "User ID") @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Map<String, Object> response = userService.gdprDeleteUser(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = {"/me/export", "/export", "/gdpr-export"})
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "GDPR Data Portability export", description = "Exports user's personal info, documents, and activity history in machine-readable JSON format.")
    @ApiResponse(responseCode = "200", description = "Data export generated successfully")
    public ResponseEntity<Map<String, Object>> exportMyData(@AuthenticationPrincipal UserDetails userDetails) {
        Map<String, Object> export = userService.gdprExportUser(userDetails.getUsername());
        return ResponseEntity.ok(export);
    }
}
