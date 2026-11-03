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

        @com.fasterxml.jackson.annotation.JsonAlias({"ownerId", "owner_id"})
        private Long ownerId;

        private String fileType;

        private Integer fileSizeKb;

        @NotBlank(message = "File is required")
        @com.fasterxml.jackson.annotation.JsonAlias({"file", "storageUrl"})
        private String storageUrl;

        private String changeSummary;

        @NotBlank(message = "Category is required")
        private String category;

        private String accessLevel;

        @NotNull(message = "Retention Period is required")
        @com.fasterxml.jackson.annotation.JsonAlias({"retentionPeriod", "retentionPeriodYears"})
        private Integer retentionPeriodYears;

        private java.time.LocalDate retentionDate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DocumentMetadataUpdateRequest {
        @NotBlank(message = "Title is required")
        private String title;
        private String category;
        private String accessLevel;
        private Integer retentionPeriodYears;
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
        @com.fasterxml.jackson.annotation.JsonAlias({"file", "storageUrl"})
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
        private String category;
        private String accessLevel;
        private Integer retentionPeriodYears;
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

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DocumentPaginatedResponse {
        private java.util.List<DocumentResponse> documents;
        private long totalCount;
        private int currentPage;
        private int pageSize;
        private int totalPages;
    }
}
