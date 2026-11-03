package com.dms.controller;

import com.dms.dto.AuthDTOs.LoginRequest;
import com.dms.dto.AuthDTOs.LoginResponse;
import com.dms.dto.AuthDTOs.RegisterRequest;
import com.dms.dto.ErrorResponse;
import com.dms.entity.Users;
import com.dms.repository.UserRepository;
import com.dms.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import com.dms.security.RateLimiter;
import com.dms.exception.TooManyRequestsException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Authentication", description = "Endpoints for user registration, login, logout, password change, and profile retrieval")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final RateLimiter rateLimiter;

    public AuthController(AuthService authService, UserRepository userRepository, RateLimiter rateLimiter) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/api/auth/register")
    @Operation(summary = "Register a new user", description = "Creates a new user account with specified role and hashed password.")
    @ApiResponse(responseCode = "200", description = "User registered successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = LoginResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid request (missing fields, format errors)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Email or phone number already registered", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<LoginResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest) {
        String ipAddress = servletRequest.getRemoteAddr();
        if (!rateLimiter.isAllowed("register:" + ipAddress, 100, 24 * 60 * 60 * 1000L)) {
            throw new TooManyRequestsException("Registration limit reached for today");
        }
        LoginResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/auth/login")
    @Operation(summary = "Authenticate user and get JWT token", description = "Validates user credentials and returns JWT bearer token along with user details.")
    @ApiResponse(responseCode = "200", description = "Login successful", content = @Content(mediaType = "application/json", schema = @Schema(implementation = LoginResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid credentials or request payload", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Authentication failed (invalid password / account locked)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String ipAddress = servletRequest.getRemoteAddr();
        if (!rateLimiter.isAllowed("login:" + ipAddress, 10000, 15 * 60 * 1000L)) {
            throw new TooManyRequestsException("Too many login attempts, please try again later");
        }
        LoginResponse response = authService.login(request, ipAddress);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/auth/logout")
    @Operation(summary = "Logout current user", description = "Stateless logout endpoint for client session termination.")
    @SecurityRequirement(name = "BearerAuth")
    @ApiResponse(responseCode = "200", description = "Logout successful")
    @ApiResponse(responseCode = "401", description = "Unauthorized (missing or invalid token)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails != null) {
            authService.logout(userDetails.getUsername());
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/auth/change-password")
    @Operation(summary = "Change password for authenticated user", description = "Updates password after verifying old password and password complexity rules.")
    @SecurityRequirement(name = "BearerAuth")
    @ApiResponse(responseCode = "200", description = "Password changed successfully")
    @ApiResponse(responseCode = "400", description = "Validation failure or incorrect old password", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized (token expired or missing)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<java.util.Map<String, String>> changePassword(
            @Valid @RequestBody com.dms.dto.AuthDTOs.ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        authService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(java.util.Map.of("message", "Password changed successfully. Please log in again."));
    }

    @GetMapping("/api/users/profile")
    @Operation(summary = "Get profile of currently logged-in user", description = "Retrieves user details based on active JWT token claims.")
    @SecurityRequirement(name = "BearerAuth")
    @ApiResponse(responseCode = "200", description = "Profile retrieved successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = Users.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized (token expired or missing)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Users> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Users user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return ResponseEntity.ok(user);
    }
}
