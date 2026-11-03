package com.dms.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemHealth {
    private String status;
    private Long totalUsers;
    private Long totalDocuments;
    private Map<String, Long> documentsByStatus;
    private Long pendingWorkflows;
    private Long overdueWorkflows;
    private String storageStatus;
    private Double memoryUsagePercentage;
    private String memoryAlert;
    private LocalDateTime timestamp;
}
