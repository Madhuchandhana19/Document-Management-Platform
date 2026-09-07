package com.dms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class WorkflowDTOs {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkflowInitiateRequest {
        @NotNull(message = "Document ID is required")
        private Long documentId;

        private LocalDate dueDate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkflowDecisionRequest {
        private String decisionNote;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkflowResponse {
        private Long id;
        private Long documentId;
        private String documentTitle;
        private String initiatedByUsername;
        private Integer currentStep;
        private String status;
        private LocalDate dueDate;
        private String approvedByUsername;
        private String decisionNote;
        private LocalDateTime createdAt;
        private LocalDateTime decidedAt;
    }
}
