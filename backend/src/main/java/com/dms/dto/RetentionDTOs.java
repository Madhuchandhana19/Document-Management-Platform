package com.dms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

public class RetentionDTOs {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RetentionPolicyRequest {
        @NotNull(message = "Document ID is required")
        private Long documentId;

        @NotNull(message = "Retention date is required")
        private LocalDate retentionDate;
    }
}
