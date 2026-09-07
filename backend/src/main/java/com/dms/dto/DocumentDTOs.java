package com.dms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class DocumentDTOs {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DocumentUploadRequest {
        @NotBlank(message = "Title is required")
        private String title;

        private Long folderId;

        @NotBlank(message = "File type is required")
        private String fileType;

        @NotNull(message = "File size is required")
        @Max(value = 50000, message = "File size must not exceed 50 MB")
        private Integer fileSizeKb;

        @NotBlank(message = "Storage URL is required")
        private String storageUrl;

        private String changeSummary;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DocumentUpdateRequest {
        @NotBlank(message = "File type is required")
        private String fileType;

        @NotBlank(message = "Storage URL is required")
        private String storageUrl;

        @NotBlank(message = "Change summary is required")
        private String changeSummary;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DocumentResponse {
        private Long id;
        private String title;
        private Long folderId;
        private String ownerUsername;
        private Integer currentVersion;
        private String fileType;
        private Integer fileSizeKb;
        private String storageUrl;
        private String status;
        private LocalDate retentionDate;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DocumentVersionResponse {
        private Long id;
        private Integer versionNo;
        private String uploadedByUsername;
        private String fileUrl;
        private String changeSummary;
        private LocalDateTime createdAt;
        private String checksum;
    }
}
