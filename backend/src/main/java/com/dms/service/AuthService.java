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
        String cleanEmail = req.getEmail() != null ? req.getEmail().trim().toLowerCase() : "";
        String cleanPhone = req.getPhoneNumber() != null ? req.getPhoneNumber().trim() : "";

        // Validate name pattern: ^[A-Za-z ]{2,100}$
        if (req.getName() == null || !req.getName().trim().matches("^[A-Za-z ]{2,100}$")) {
            throw new InvalidNameException("Name must not contain numbers or special characters");
        }

        // Validate phone pattern: ^\d{10}$
        if (cleanPhone.isEmpty() || !cleanPhone.matches("^\\d{10}$")) {
            throw new InvalidPhoneException("Phone Number must be exactly 10 digits long");
        }

        // Check if email or phone is already taken (regardless of role or letter case)
        if (userRepository.existsByEmailIgnoreCase(cleanEmail) || userRepository.existsByEmail(cleanEmail)) {
            throw new com.dms.exception.UserAlreadyExistsException("This email is already registered");
        }
        if (userRepository.existsByPhoneNumber(cleanPhone)) {
            throw new com.dms.exception.UserAlreadyExistsException("Phone number is already taken");
        }

        // Password policy: min 8 chars, uppercase, lowercase, digit, special char
        if (req.getPassword() == null || req.getPassword().trim().length() < 8) {
            throw new IllegalArgumentException("Password must meet security requirements: minimum 8 characters with uppercase, lowercase, digit, and special character");
        }
        if (!req.getPassword().matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter");
        }
        if (!req.getPassword().matches(".*[a-z].*")) {
            throw new IllegalArgumentException("Password must contain at least one lowercase letter");
        }
        if (!req.getPassword().matches(".*[0-9].*")) {
            throw new IllegalArgumentException("Password must contain at least one digit");
        }
        if (!req.getPassword().matches(".*[^A-Za-z0-9\\s].*")) {
            throw new IllegalArgumentException("Password must contain at least one special character (!@#$%^&*)");
        }

        Role userRole;
        String rawRole = req.getRole() != null ? req.getRole().trim().toUpperCase() : "VIEWER";
        if (rawRole.startsWith("ROLE_")) {
            rawRole = rawRole.substring(5);
        }
        switch (rawRole) {
            case "ADMIN": userRole = Role.ADMIN; break;
            case "OWNER":
            case "DOCUMENT_OWNER": userRole = Role.DOCUMENT_OWNER; break;
            case "EDITOR": userRole = Role.EDITOR; break;
            case "APPROVER":
            case "MANAGER":
            case "SUPERVISOR": userRole = Role.APPROVER; break;
            case "VIEWER": userRole = Role.VIEWER; break;
            case "COMPLIANCE":
            case "COMPLIANCE_OFFICER":
            case "OFFICER": userRole = Role.COMPLIANCE_OFFICER; break;
            case "GUEST": userRole = Role.GUEST; break;
            default:
                try {
                    userRole = Role.valueOf(rawRole);
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Invalid role. Must be one of: ADMIN, MANAGER, SUPERVISOR, OFFICER, OWNER, GUEST");
                }
        }

        Users user = Users.builder()
                .name(req.getName().trim())
                .phoneNumber(cleanPhone)
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(userRole)
                .isActive(true)
                .failedLoginAttempts(0)
                .build();

        user = userRepository.saveAndFlush(user);

        String userIdStr = user.getId() != null ? user.getId().toString() : "0";
        auditService.log(cleanEmail, null, "REGISTER", "Users", userIdStr, null, cleanEmail, "system");

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());

        long expiresInSec = 28800L;
        if (user.getRole() == Role.ADMIN) {
            expiresInSec = 86400L;
        } else if (user.getRole() == Role.APPROVER || user.getRole() == Role.COMPLIANCE_OFFICER) {
            expiresInSec = 43200L;
        }

        return LoginResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .userId(user.getId())
                .expiresIn(expiresInSec)
                .user(com.dms.dto.AuthDTOs.UserSummary.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .build())
                .build();
    }

    private static boolean authServiceAvailable = true;

    public static void setAuthServiceAvailable(boolean available) {
        authServiceAvailable = available;
    }

    public static boolean isAuthServiceAvailable() {
        return authServiceAvailable;
    }

    @Transactional(noRollbackFor = {BadCredentialsException.class, LockedException.class})
    public LoginResponse login(LoginRequest req, String ipAddress) {
        if (!authServiceAvailable) {
            throw new com.dms.exception.AuthServiceUnavailableException("Authentication service unavailable");
        }

        String cleanEmail = req.getEmail() != null ? req.getEmail().trim().toLowerCase() : "";
        Users user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseGet(() -> userRepository.findByEmail(req.getEmail()).orElse(null));

        if (user == null) {
            throw new BadCredentialsException("Invalid credentials. Please check your email and password.");
        }

        if (!user.isActive()) {
            throw new DisabledException("User account is inactive");
        }

        boolean matches = passwordEncoder.matches(req.getPassword(), user.getPasswordHash());

        if (matches) {
            user.setLockedUntil(null);
            user.setFailedLoginAttempts(0);
        } else if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new LockedException("Account temporarily locked. Try again in 15 minutes.");
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
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

            if (attempts >= 5 || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now()))) {
                throw new LockedException("Account temporarily locked. Try again in 15 minutes.");
            }

            throw new BadCredentialsException("Invalid credentials. Please check your email and password.");
        }

        // On success: reset attempts, update last login
        try {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        } catch (Exception e) {
            // Ignore concurrent database update contention under high load
        }

        try {
            auditService.log(user.getEmail(), null, "LOGIN", "Users", user.getId().toString(), null, "LOGIN_SUCCESS",
                    ipAddress);
        } catch (Exception e) {
            // Ignore audit log async dispatch exception
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());

        long expiresInSec = 28800L;
        if (user.getRole() == Role.ADMIN) {
            expiresInSec = 86400L;
        } else if (user.getRole() == Role.APPROVER || user.getRole() == Role.COMPLIANCE_OFFICER) {
            expiresInSec = 43200L;
        }

        return LoginResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .userId(user.getId())
                .expiresIn(expiresInSec)
                .user(com.dms.dto.AuthDTOs.UserSummary.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .build())
                .build();
    }

    @Transactional
    public void changePassword(String username, com.dms.dto.AuthDTOs.ChangePasswordRequest req) {
        Users user = userRepository.findByEmail(username)
                .orElseThrow(() -> new com.dms.exception.ResourceNotFoundException("User not found: " + username));

        if (!passwordEncoder.matches(req.getOldPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials. Current password does not match.");
        }

        String passwordRegex = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9\\s])(?=\\S+$).{8,}$";
        if (req.getNewPassword() == null || !req.getNewPassword().matches(passwordRegex)) {
            throw new IllegalArgumentException("Password must meet security requirements: minimum 8 characters with uppercase, lowercase, digit, and special character");
        }

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);

        auditService.log(username, null, "PASSWORD_CHANGE", "Users", user.getId().toString(), null, "Password updated successfully", "system");
    }

    @Transactional
    public void logout(String username) {
        if (username != null) {
            Users user = userRepository.findByEmail(username).orElse(null);
            if (user != null) {
                auditService.log(username, null, "USER_LOGOUT", "Users", user.getId().toString(), null, "LOGOUT_SUCCESS", "system");
            }
        }
    }
}
