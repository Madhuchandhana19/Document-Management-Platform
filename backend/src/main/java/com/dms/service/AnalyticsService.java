package com.dms.service;

import com.dms.dto.SystemHealth;
import com.dms.dto.UploadTrend;
import com.dms.dto.WorkflowAnalytics;
import com.dms.entity.ApprovalWorkflow;
import com.dms.entity.WorkflowStatus;
import com.dms.entity.Document;
import com.dms.entity.DocumentStatus;
import com.dms.repository.ApprovalWorkflowRepository;
import com.dms.repository.AuditLogRepository;
import com.dms.repository.DocumentRepository;
import com.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final ApprovalWorkflowRepository approvalWorkflowRepository;
    private final AuditLogRepository auditLogRepository;

    public SystemHealth getSystemHealth() {
        long totalUsers = userRepository.count();
        long totalDocuments = documentRepository.count();

        Map<String, Long> documentsByStatus = new HashMap<>();
        for (DocumentStatus status : DocumentStatus.values()) {
            documentsByStatus.put(status.name(), 0L);
        }

        List<Document> allDocs = documentRepository.findAll();
        for (Document doc : allDocs) {
            String statusName = doc.getStatus().name();
            documentsByStatus.put(statusName, documentsByStatus.getOrDefault(statusName, 0L) + 1);
        }

        long pendingWorkflows = approvalWorkflowRepository.findByStatus(WorkflowStatus.PENDING).size();
        long overdueWorkflows = approvalWorkflowRepository.findOverdueWorkflows(LocalDate.now()).size();

        return SystemHealth.builder()
                .status("UP")
                .totalUsers(totalUsers)
                .totalDocuments(totalDocuments)
                .documentsByStatus(documentsByStatus)
                .pendingWorkflows(pendingWorkflows)
                .overdueWorkflows(overdueWorkflows)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public List<UploadTrend> getUploadTrends() {
        List<Document> documents = documentRepository.findAll();
        Map<LocalDate, Long> trendsMap = documents.stream()
                .filter(d -> d.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        d -> d.getCreatedAt().toLocalDate(),
                        TreeMap::new,
                        Collectors.counting()
                ));

        return trendsMap.entrySet().stream()
                .map(entry -> UploadTrend.builder()
                        .date(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    public List<WorkflowAnalytics> getWorkflowAnalytics() {
        List<ApprovalWorkflow> workflows = approvalWorkflowRepository.findAll();
        Map<WorkflowStatus, List<ApprovalWorkflow>> grouped = workflows.stream()
                .collect(Collectors.groupingBy(ApprovalWorkflow::getStatus));

        return Arrays.stream(WorkflowStatus.values())
                .map(status -> {
                    List<ApprovalWorkflow> list = grouped.getOrDefault(status, Collections.emptyList());
                    long count = list.size();
                    Double avgDecisionHours = null;

                    List<ApprovalWorkflow> decidedWorkflows = list.stream()
                            .filter(w -> w.getDecidedAt() != null && w.getCreatedAt() != null)
                            .toList();

                    if (!decidedWorkflows.isEmpty()) {
                        double totalHours = decidedWorkflows.stream()
                                .mapToDouble(w -> {
                                    Duration duration = Duration.between(w.getCreatedAt(), w.getDecidedAt());
                                    return duration.toMinutes() / 60.0;
                                })
                                .sum();
                        avgDecisionHours = totalHours / decidedWorkflows.size();
                    }

                    return WorkflowAnalytics.builder()
                            .status(status.name())
                            .count(count)
                            .avgDecisionHours(avgDecisionHours)
                            .build();
                })
                .collect(Collectors.toList());
    }
}
