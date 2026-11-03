package com.dms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class AccessControlDTOs {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GrantAccessRequest {
        @com.fasterxml.jackson.annotation.JsonAlias({"userId"})
        private Long userId;

        @com.fasterxml.jackson.annotation.JsonAlias({"userEmail", "email"})
        private String userEmail;

        @NotBlank(message = "Permission is required")
        private String permission;

        private LocalDate validTo;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RevokeAccessRequest {
        @NotNull(message = "User ID is required")
        private Long userId;

        @NotBlank(message = "Permission is required")
        private String permission;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AccessControlResponse {
        private Long id;
        private Long documentId;
        private String username;
        private String permission;
        private String grantedByUsername;
        private LocalDate validFrom;
        private LocalDate validTo;
        private LocalDateTime createdAt;
    }
}
