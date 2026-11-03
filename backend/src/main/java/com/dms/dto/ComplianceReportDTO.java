package com.dms.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceReportDTO {
    private String reportTitle;
    private String startDate;
    private String endDate;
    private Map<String, Object> executiveSummary;
    private String generatedBy;
    private String generatorRole;
    private LocalDateTime exportTimestamp;
    private String digitalSignature;
    private List<Map<String, Object>> detailedTransactions;
}
