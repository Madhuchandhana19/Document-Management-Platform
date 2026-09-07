package com.dms.service;

import com.dms.dto.AuthDTOs.LoginRequest;
import com.dms.dto.AuthDTOs.LoginResponse;
import com.dms.dto.AuthDTOs.RegisterRequest;
import com.dms.entity.Role;
import com.dms.entity.Users;
import com.dms.exception.InvalidNameException;
import com.dms.exception.InvalidPhoneException;
import com.dms.repository.UserRepository;
import com.dms.security.JwtUtil;
import com.dms.audit.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final AuditService auditService;

    @Transactional
    public LoginResponse register(RegisterRequest req) {
        // Validate name pattern: ^[A-Za-z ]{2,100}$
        if (req.getName() == null || !req.getName().matches("^[A-Za-z ]{2,100}$")) {
            throw new InvalidNameException("Name must not contain numbers or special characters");
        }

        // Validate phone pattern: ^\d{10}$
        if (req.getPhoneNumber() == null || !req.getPhoneNumber().matches("^\\d{10}$")) {
            throw new InvalidPhoneException("Phone Number must be exactly 10 digits long");
        }

        // Check if email or phone is already taken
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email is already taken");
        }
        if (userRepository.existsByPhoneNumber(req.getPhoneNumber())) {
            throw new IllegalArgumentException("Phone number is already taken");
        }

        // Password policy: min 8 chars, uppercase, lowercase, digit, special char
        // Regex: at least one digit, one lowercase, one uppercase, one special char, no
        // spaces, at least 8 characters
        String passwordRegex = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!_\\-])(?=\\S+$).{8,}$";
        if (req.getPassword() == null || !req.getPassword().matches(passwordRegex)) {
            throw new IllegalArgumentException("Password must meet security requirements");
        }

        Role userRole;
        try {
            userRole = Role.valueOf(req.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role specified");
        }

        Users user = Users.builder()
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(userRole)
                .isActive(true)
                .failedLoginAttempts(0)
                .build();

        userRepository.save(user);

        String userIdStr = user.getId() != null ? user.getId().toString() : "0";
        auditService.log(req.getEmail(), null, "REGISTER", "Users", userIdStr, null, req.getEmail(), "system");

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());

        return LoginResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .userId(user.getId())
                .build();
    }

    @Transactional
    public LoginResponse login(LoginRequest req, String ipAddress) {
        Users user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!user.isActive()) {
            throw new DisabledException("User account is inactive");
        }

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new LockedException("User account is locked");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
        } catch (BadCredentialsException e) {
            // Increment failed login attempts and check for progressive lockout
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);

            if (attempts >= 15) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(1440)); // 24 hours lockout
            } else if (attempts >= 10) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(30)); // 30 min lockout
            } else if (attempts >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15)); // 15 min lockout
            }

            userRepository.save(user);
            auditService.log(req.getEmail(), null, "LOGIN_FAILED", "Users",
                    user.getId() != null ? user.getId().toString() : null, null, "FAILED_ATTEMPT_" + attempts,
                    ipAddress);
            throw e;
        }

        // On success: reset attempts, update last login
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        auditService.log(user.getEmail(), null, "LOGIN", "Users", user.getId().toString(), null, "LOGIN_SUCCESS",
                ipAddress);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());

        return LoginResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .userId(user.getId())
                .build();
    }
}
