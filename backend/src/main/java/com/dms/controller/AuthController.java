package com.dms.controller;

import com.dms.dto.AuthDTOs.LoginRequest;
import com.dms.dto.AuthDTOs.LoginResponse;
import com.dms.dto.AuthDTOs.RegisterRequest;
import com.dms.entity.Users;
import com.dms.repository.UserRepository;
import com.dms.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
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
@Tag(name = "Authentication", description = "Endpoints for user registration, login, logout, and profile")
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
    @Operation(summary = "Register a new user")
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
    @Operation(summary = "Authenticate user and get JWT token")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String ipAddress = servletRequest.getRemoteAddr();
        if (!rateLimiter.isAllowed("login:" + ipAddress, 100, 15 * 60 * 1000L)) {
            throw new TooManyRequestsException("Too many login attempts, please try again later");
        }
        LoginResponse response = authService.login(request, ipAddress);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/auth/logout")
    @Operation(summary = "Logout the current user (Stateless endpoint)")
    public ResponseEntity<Void> logout() {
        // Stateless JWT logout - clients should discard token.
        // TODO: Wire token blacklisting in the future.
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/users/profile")
    @Operation(summary = "Get profile of the currently logged-in user")
    public ResponseEntity<Users> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Users user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return ResponseEntity.ok(user);
    }
}
