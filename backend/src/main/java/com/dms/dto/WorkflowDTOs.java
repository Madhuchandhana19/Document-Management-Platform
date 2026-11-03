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

        @NotNull(message = "Due Date is required")
        @com.fasterxml.jackson.annotation.JsonAlias({"dueDate"})
        private LocalDate dueDate;

        @com.fasterxml.jackson.annotation.JsonAlias({"approverId", "assignedApproverId"})
        private Long assignedApproverId;

        private String assignedApproverEmail;

        @com.fasterxml.jackson.annotation.JsonAlias({"comments", "comment"})
        private String comment;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkflowDecisionRequest {
        private String decisionNote;
        private String signature;
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
        private String initiatedByName;
        private Long assignedApproverId;
        private String assignedApproverUsername;
        private String assignedApproverName;
        private String comment;
        private String signature;
        private Integer currentStep;
        private String status;
        private LocalDate dueDate;
        private String approvedByUsername;
        private String approvedByName;
        private String decisionNote;
        private String slaStatus; // ON_TRACK, SLA_WARNING, SLA_BREACH
        private LocalDateTime createdAt;
        private LocalDateTime decidedAt;
    }
}
