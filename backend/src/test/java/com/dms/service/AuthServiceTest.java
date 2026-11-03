package com.dms.service;

import com.dms.service.AuthService;
import com.dms.audit.AuditService;
import com.dms.dto.AuthDTOs.LoginRequest;
import com.dms.dto.AuthDTOs.LoginResponse;
import com.dms.dto.AuthDTOs.RegisterRequest;
import com.dms.entity.Role;
import com.dms.entity.Users;
import com.dms.exception.InvalidNameException;
import com.dms.exception.InvalidPhoneException;
import com.dms.repository.UserRepository;
import com.dms.security.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("Should successfully register a new user with valid details")
    void registerSucceeds() {
        RegisterRequest req = RegisterRequest.builder()
                .name("Alice Admin")
                .phoneNumber("1234567890")
                .email("alice@dms.com")
                .password("Password123!")
                .role("ADMIN")
                .build();

        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.existsByPhoneNumber(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("mockedHash");
        when(jwtUtil.generateToken(any(), anyString(), any(Role.class))).thenReturn("mockToken");

        LoginResponse resp = authService.register(req);

        assertNotNull(resp);
        assertEquals("alice@dms.com", resp.getEmail());
        assertEquals("mockToken", resp.getToken());
        assertEquals("ADMIN", resp.getRole());

        verify(userRepository, times(1)).save(any(Users.class));
        verify(auditService, times(1)).log(anyString(), any(), eq("REGISTER"), anyString(), any(), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("Should throw InvalidNameException when name contains digits")
    void registerThrowsInvalidName() {
        RegisterRequest req = RegisterRequest.builder()
                .name("Alice123")
                .phoneNumber("1234567890")
                .email("alice@dms.com")
                .password("Password123!")
                .role("ADMIN")
                .build();

        assertThrows(InvalidNameException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any(Users.class));
    }

    @Test
    @DisplayName("Should throw InvalidPhoneException when phone number is not 10 digits")
    void registerThrowsInvalidPhone() {
        RegisterRequest req = RegisterRequest.builder()
                .name("Alice Admin")
                .phoneNumber("12345")
                .email("alice@dms.com")
                .password("Password123!")
                .role("ADMIN")
                .build();

        assertThrows(InvalidPhoneException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any(Users.class));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when email already exists")
    void registerThrowsEmailExists() {
        RegisterRequest req = RegisterRequest.builder()
                .name("Alice Admin")
                .phoneNumber("1234567890")
                .email("alice@dms.com")
                .password("Password123!")
                .role("ADMIN")
                .build();

        when(userRepository.existsByEmailIgnoreCase("alice@dms.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any(Users.class));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when password fails security policy")
    void registerThrowsPasswordPolicyFailure() {
        RegisterRequest req = RegisterRequest.builder()
                .name("Alice Admin")
                .phoneNumber("1234567890")
                .email("alice@dms.com")
                .password("123") // too short, no uppercase, etc.
                .role("ADMIN")
                .build();

        assertThrows(IllegalArgumentException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any(Users.class));
    }

    @Test
    @DisplayName("Should successfully authenticate user, reset attempts, and update last login")
    void loginSucceeds() {
        LoginRequest req = LoginRequest.builder()
                .email("alice@dms.com")
                .password("Password123!")
                .build();

        Users mockUser = Users.builder()
                .id(1L)
                .name("Alice Admin")
                .email("alice@dms.com")
                .role(Role.ADMIN)
                .isActive(true)
                .failedLoginAttempts(3)
                .build();

        when(userRepository.findByEmail("alice@dms.com")).thenReturn(Optional.of(mockUser));
        when(jwtUtil.generateToken(any(), anyString(), any(Role.class))).thenReturn("mockToken");

        LoginResponse resp = authService.login(req, "127.0.0.1");

        assertNotNull(resp);
        assertEquals(0, mockUser.getFailedLoginAttempts());
        assertNotNull(mockUser.getLastLogin());
        assertNull(mockUser.getLockedUntil());
        verify(userRepository, times(1)).save(mockUser);
        verify(auditService, times(1)).log(eq("alice@dms.com"), any(), eq("LOGIN"), anyString(), any(), any(), eq("LOGIN_SUCCESS"), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("Should increment failed attempts on BadCredentialsException and apply progressive lockout at 5 failures")
    void loginLocksAfterFiveFailures() {
        LoginRequest req = LoginRequest.builder()
                .email("alice@dms.com")
                .password("WrongPassword")
                .build();

        Users mockUser = Users.builder()
                .id(1L)
                .name("Alice Admin")
                .email("alice@dms.com")
                .role(Role.ADMIN)
                .isActive(true)
                .failedLoginAttempts(4) // 4 previous attempts
                .build();

        when(userRepository.findByEmail("alice@dms.com")).thenReturn(Optional.of(mockUser));
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("Invalid credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(req, "127.0.0.1"));

        assertEquals(5, mockUser.getFailedLoginAttempts());
        assertNotNull(mockUser.getLockedUntil());
        verify(userRepository, times(1)).save(mockUser);
        verify(auditService, times(1)).log(eq("alice@dms.com"), any(), eq("LOGIN_FAILED"), anyString(), any(), any(), eq("FAILED_ATTEMPT_5"), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("Should throw LockedException when trying to login on a currently locked account")
    void loginThrowsLockedException() {
        LoginRequest req = LoginRequest.builder()
                .email("alice@dms.com")
                .password("Password123!")
                .build();

        Users mockUser = Users.builder()
                .id(1L)
                .name("Alice Admin")
                .email("alice@dms.com")
                .role(Role.ADMIN)
                .isActive(true)
                .lockedUntil(LocalDateTime.now().plusMinutes(10)) // locked
                .build();

        when(userRepository.findByEmail("alice@dms.com")).thenReturn(Optional.of(mockUser));

        assertThrows(LockedException.class, () -> authService.login(req, "127.0.0.1"));
        verify(authenticationManager, never()).authenticate(any());
    }
}
