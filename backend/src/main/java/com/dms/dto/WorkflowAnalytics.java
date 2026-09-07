package com.dms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowAnalytics {
    private String status;
    private Long count;
    private Double avgDecisionHours;
}
