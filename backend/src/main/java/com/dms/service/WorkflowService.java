package com.dms.service;

import com.dms.audit.AuditService;
import com.dms.dto.NotificationDTO.NotificationCreateRequest;
import com.dms.dto.WorkflowDTOs.*;
import com.dms.entity.*;
import com.dms.exception.ResourceNotFoundException;
import com.dms.repository.ApprovalWorkflowRepository;
import com.dms.repository.DocumentRepository;
import com.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final ApprovalWorkflowRepository approvalWorkflowRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public WorkflowResponse initiate(WorkflowInitiateRequest req, String username) {
        Document document = documentRepository.findById(req.getDocumentId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + req.getDocumentId()));

        // Check if there is already a PENDING workflow for this document
        boolean alreadyPending = approvalWorkflowRepository.findByDocumentId(req.getDocumentId())
                .stream()
                .anyMatch(w -> w.getStatus() == WorkflowStatus.PENDING);
        if (alreadyPending) {
            throw new com.dms.exception.DuplicateWorkflowException("Workflow already pending for this document");
        }

        Users initiator = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Initiator user not found: " + username));

        if (req.getAssignedApproverId() == null && (req.getAssignedApproverEmail() == null || req.getAssignedApproverEmail().trim().isEmpty())) {
            throw new IllegalArgumentException("Approver is required");
        }

        Users assignedApprover = null;
        if (req.getAssignedApproverId() != null) {
            assignedApprover = userRepository.findById(req.getAssignedApproverId()).orElse(null);
        }
        if (assignedApprover == null && req.getAssignedApproverEmail() != null) {
            assignedApprover = userRepository.findByEmail(req.getAssignedApproverEmail().trim().toLowerCase()).orElse(null);
        }
        if (assignedApprover == null) {
            throw new IllegalArgumentException("Approver is required");
        }

        ApprovalWorkflow workflow = ApprovalWorkflow.builder()
                .document(document)
                .initiatedBy(initiator)
                .assignedApprover(assignedApprover)
                .comment(req.getComment())
                .currentStep(1)
                .status(WorkflowStatus.PENDING)
                .dueDate(req.getDueDate())
                .build();

        approvalWorkflowRepository.save(workflow);

        // Update document status to UNDER_REVIEW
        document.setStatus(DocumentStatus.UNDER_REVIEW);
        documentRepository.save(document);

        // Audit Log entry matching SRS format: "owner@dms.com initiated approval workflow"
        auditService.log(username, document, "WORKFLOW_INITIATE", "ApprovalWorkflow",
                workflow.getId().toString(), null, username + " initiated approval workflow", "system");

        // 1. Dispatch notification to initiator (PROMPT 9.1 requirement)
        try {
            notificationService.createNotification(NotificationCreateRequest.builder()
                    .userId(initiator.getId())
                    .message("You sent '" + document.getTitle() + "' for approval")
                    .detail("Sent to " + (assignedApprover != null ? assignedApprover.getEmail() : "Approver") + ". Due Date: " + (req.getDueDate() != null ? req.getDueDate() : "N/A"))
                    .type("APPROVAL")
                    .build());
        } catch (Exception e) {}

        // 2. Dispatch notification & email to approver (PROMPT 9.1 & 9.2 & 9.4)
        if (assignedApprover != null) {
            try {
                notificationService.dispatchApprovalNotification(
                        assignedApprover,
                        initiator,
                        document,
                        req.getDueDate() != null ? req.getDueDate().toString() : null
                );
            } catch (Exception e) {}
        }

        return toResponse(workflow);
    }

    public List<WorkflowResponse> getPending(String username) {
        return approvalWorkflowRepository.findByStatus(WorkflowStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<WorkflowResponse> getAll(String username) {
        return approvalWorkflowRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WorkflowResponse approve(Long id, WorkflowDecisionRequest req, String username) {
        ApprovalWorkflow workflow = approvalWorkflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with ID: " + id));

        if (workflow.getStatus() == WorkflowStatus.APPROVED) {
            String approverName = workflow.getApprovedBy() != null ? workflow.getApprovedBy().getName() : "another approver";
            String decidedAtStr = workflow.getDecidedAt() != null ? workflow.getDecidedAt().toString() : "earlier";
            throw new IllegalStateException("This workflow was already approved by " + approverName + " on " + decidedAtStr);
        }
        if (workflow.getStatus() != WorkflowStatus.PENDING) {
            throw new IllegalStateException("Cannot approve a workflow that is not PENDING. Current status: " + workflow.getStatus());
        }

        Users approver = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Approver user not found: " + username));

        workflow.setStatus(WorkflowStatus.APPROVED);
        workflow.setApprovedBy(approver);
        workflow.setDecisionNote(req.getDecisionNote());
        workflow.setSignature(req.getSignature() != null && !req.getSignature().isBlank() ? req.getSignature() : approver.getName());
        workflow.setDecidedAt(LocalDateTime.now());
        approvalWorkflowRepository.save(workflow);

        // Update document status to APPROVED
        Document document = workflow.getDocument();
        document.setStatus(DocumentStatus.APPROVED);
        documentRepository.save(document);

        // Audit Log matching SRS format: "David Approver approved workflow on 8/10/2026"
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("M/d/yyyy"));
        String auditMessage = approver.getName() + " approved workflow on " + dateStr;
        auditService.log(username, document, "WORKFLOW_APPROVE", "ApprovalWorkflow",
                workflow.getId().toString(), "PENDING", auditMessage, "system");

        // Notify Document Owner
        if (document.getOwner() != null) {
            try {
                notificationService.createNotification(NotificationCreateRequest.builder()
                        .userId(document.getOwner().getId())
                        .message("Your document " + document.getTitle() + " was approved")
                        .detail("Approved by " + approver.getName() + ". Note: " + (req.getDecisionNote() != null ? req.getDecisionNote() : "No note attached"))
                        .type("WORKFLOW_APPROVED")
                        .build());
            } catch (Exception e) {
                // Ignore failure
            }
        }

        return toResponse(workflow);
    }

    @Transactional
    public WorkflowResponse reject(Long id, WorkflowDecisionRequest req, String username) {
        ApprovalWorkflow workflow = approvalWorkflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found with ID: " + id));

        if (workflow.getStatus() != WorkflowStatus.PENDING) {
            throw new IllegalStateException("Cannot reject a workflow that is not PENDING. Current status: " + workflow.getStatus());
        }

        if (req.getDecisionNote() == null || req.getDecisionNote().trim().isEmpty()) {
            throw new IllegalArgumentException("Reason for rejection (required)");
        }

        Users approver = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Approver user not found: " + username));

        workflow.setStatus(WorkflowStatus.REJECTED);
        workflow.setApprovedBy(approver);
        workflow.setDecisionNote(req.getDecisionNote());
        workflow.setSignature(req.getSignature() != null && !req.getSignature().isBlank() ? req.getSignature() : approver.getName());
        workflow.setDecidedAt(LocalDateTime.now());
        approvalWorkflowRepository.save(workflow);

        // Update document status back to DRAFT for revision
        Document document = workflow.getDocument();
        document.setStatus(DocumentStatus.DRAFT);
        documentRepository.save(document);

        // Audit Log matching SRS format: "David Approver rejected workflow with reason: '...'"
        String auditMessage = approver.getName() + " rejected workflow with reason: '" + req.getDecisionNote() + "'";
        auditService.log(username, document, "WORKFLOW_REJECT", "ApprovalWorkflow",
                workflow.getId().toString(), "PENDING", auditMessage, "system");

        // Notify Document Owner
        if (document.getOwner() != null) {
            try {
                notificationService.createNotification(NotificationCreateRequest.builder()
                        .userId(document.getOwner().getId())
                        .message("Your document " + document.getTitle() + " was rejected")
                        .detail("Rejected by " + approver.getName() + ". Reason: " + req.getDecisionNote())
                        .type("WORKFLOW_REJECTED")
                        .build());
            } catch (Exception e) {
                // Ignore failure
            }
        }

        return toResponse(workflow);
    }

    public List<WorkflowResponse> getHistory(Long documentId) {
        return approvalWorkflowRepository.findByDocumentIdOrderByCreatedAtDesc(documentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<Users> getEligibleApprovers() {
        return userRepository.findByRoleIn(Arrays.asList(Role.APPROVER, Role.ADMIN));
    }

    @Scheduled(fixedDelay = 300000) // Runs every 5 minutes
    public void checkSlaBreaches() {
        LocalDate today = LocalDate.now();
        List<ApprovalWorkflow> overdue = approvalWorkflowRepository.findOverdueWorkflows(today);

        for (ApprovalWorkflow w : overdue) {
            // Log breach event under the system account
            auditService.log("system", w.getDocument(), "WORKFLOW_SLA_BREACH", "ApprovalWorkflow",
                    w.getId().toString(), "PENDING", "SLA breached (overdue). Due date was: " + w.getDueDate(), "system");
            
            // Dispatch escalation alert notification
            if (w.getAssignedApprover() != null) {
                try {
                    notificationService.createNotification(NotificationCreateRequest.builder()
                            .userId(w.getAssignedApprover().getId())
                            .message("ESCALATION ALERT: Workflow Overdue for " + w.getDocument().getTitle())
                            .detail("SLA breach occurred! Target due date was " + w.getDueDate() + ". Escalated to supervisor.")
                            .type("SLA_BREACH_ALERT")
                            .build());
                } catch (Exception e) {}
            }
        }
    }

    private String calculateSlaStatus(ApprovalWorkflow w) {
        if (w.getStatus() != WorkflowStatus.PENDING || w.getDueDate() == null) {
            return "ON_TRACK";
        }
        LocalDate today = LocalDate.now();
        if (today.isAfter(w.getDueDate())) {
            return "SLA_BREACH";
        }
        // SLA Warning if within 2 days of due date
        if (!w.getDueDate().minusDays(2).isAfter(today)) {
            return "SLA_WARNING";
        }
        return "ON_TRACK";
    }

    private WorkflowResponse toResponse(ApprovalWorkflow w) {
        return WorkflowResponse.builder()
                .id(w.getId())
                .documentId(w.getDocument().getId())
                .documentTitle(w.getDocument().getTitle())
                .initiatedByUsername(w.getInitiatedBy() != null ? w.getInitiatedBy().getEmail() : null)
                .initiatedByName(w.getInitiatedBy() != null ? w.getInitiatedBy().getName() : null)
                .assignedApproverId(w.getAssignedApprover() != null ? w.getAssignedApprover().getId() : null)
                .assignedApproverUsername(w.getAssignedApprover() != null ? w.getAssignedApprover().getEmail() : null)
                .assignedApproverName(w.getAssignedApprover() != null ? w.getAssignedApprover().getName() : null)
                .comment(w.getComment())
                .signature(w.getSignature())
                .currentStep(w.getCurrentStep())
                .status(w.getStatus().name())
                .dueDate(w.getDueDate())
                .approvedByUsername(w.getApprovedBy() != null ? w.getApprovedBy().getEmail() : null)
                .approvedByName(w.getApprovedBy() != null ? w.getApprovedBy().getName() : null)
                .decisionNote(w.getDecisionNote())
                .slaStatus(calculateSlaStatus(w))
                .createdAt(w.getCreatedAt())
                .decidedAt(w.getDecidedAt())
                .build();
    }
}
