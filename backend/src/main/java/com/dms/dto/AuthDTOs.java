package com.dms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

public class AuthDTOs {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        @NotBlank(message = "Name is required")
        @Pattern(regexp = "^[A-Za-z ]{2,100}$", message = "Name must not contain numbers or special characters")
        private String name;

        @NotBlank(message = "Phone Number is required")
        @Pattern(regexp = "^\\d{10}$", message = "Phone Number must be exactly 10 digits long")
        private String phoneNumber;

        @NotBlank(message = "Email is required")
        @Email(message = "Please enter a valid email address")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must meet security requirements")
        private String password;

        @NotBlank(message = "Role is required")
        private String role;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Please enter a valid email address")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginResponse {
        private String token;
        private String name;
        private String email;
        private String role;
        private Long userId;
    }
}
