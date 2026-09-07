package com.dms.service;

import com.dms.audit.AuditService;
import com.dms.dto.WorkflowDTOs.*;
import com.dms.entity.ApprovalWorkflow;
import com.dms.entity.WorkflowStatus;
import com.dms.entity.Document;
import com.dms.entity.DocumentStatus;
import com.dms.entity.Users;
import com.dms.exception.ResourceNotFoundException;
import com.dms.exception.UnauthorisedAccessException;
import com.dms.repository.ApprovalWorkflowRepository;
import com.dms.repository.DocumentRepository;
import com.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final ApprovalWorkflowRepository approvalWorkflowRepository;
    private final AuditService auditService;

    @Transactional
    public WorkflowResponse initiate(WorkflowInitiateRequest req, String username) {
        Document document = documentRepository.findById(req.getDocumentId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + req.getDocumentId()));

        // Check if there is already a PENDING workflow for this document
        boolean alreadyPending = approvalWorkflowRepository.findByDocumentId(req.getDocumentId())
                .stream()
                .anyMatch(w -> w.getStatus() == WorkflowStatus.PENDING);
        if (alreadyPending) {
            throw new IllegalStateException("Workflow already pending for this document");
        }

        Users initiator = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Initiator user not found: " + username));

        ApprovalWorkflow workflow = ApprovalWorkflow.builder()
                .document(document)
                .initiatedBy(initiator)
                .currentStep(1)
                .status(WorkflowStatus.PENDING)
                .dueDate(req.getDueDate())
                .build();

        approvalWorkflowRepository.save(workflow);

        // Update document status to UNDER_REVIEW
        document.setStatus(DocumentStatus.UNDER_REVIEW);
        documentRepository.save(document);

        // Audit Log registration
        auditService.log(username, document, "WORKFLOW_INITIATE", "ApprovalWorkflow",
                workflow.getId().toString(), null, "Workflow initiated, Document status UNDER_REVIEW", "system");

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

        if (workflow.getStatus() != WorkflowStatus.PENDING) {
            throw new IllegalStateException("Cannot approve a workflow that is not PENDING. Current status: " + workflow.getStatus());
        }

        Users approver = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Approver user not found: " + username));

        workflow.setStatus(WorkflowStatus.APPROVED);
        workflow.setApprovedBy(approver);
        workflow.setDecisionNote(req.getDecisionNote());
        workflow.setDecidedAt(LocalDateTime.now());
        approvalWorkflowRepository.save(workflow);

        // Update document status to APPROVED
        Document document = workflow.getDocument();
        document.setStatus(DocumentStatus.APPROVED);
        documentRepository.save(document);

        // Audit Log
        auditService.log(username, document, "WORKFLOW_APPROVE", "ApprovalWorkflow",
                workflow.getId().toString(), "PENDING", "APPROVED. Note: " + req.getDecisionNote(), "system");

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
            throw new IllegalArgumentException("Rejection requires a decision note");
        }

        Users approver = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Approver user not found: " + username));

        workflow.setStatus(WorkflowStatus.REJECTED);
        workflow.setApprovedBy(approver);
        workflow.setDecisionNote(req.getDecisionNote());
        workflow.setDecidedAt(LocalDateTime.now());
        approvalWorkflowRepository.save(workflow);

        // Update document status back to DRAFT for revision
        Document document = workflow.getDocument();
        document.setStatus(DocumentStatus.DRAFT);
        documentRepository.save(document);

        // Audit Log
        auditService.log(username, document, "WORKFLOW_REJECT", "ApprovalWorkflow",
                workflow.getId().toString(), "PENDING", "REJECTED. Note: " + req.getDecisionNote(), "system");

        return toResponse(workflow);
    }

    public List<WorkflowResponse> getHistory(Long documentId) {
        return approvalWorkflowRepository.findByDocumentIdOrderByCreatedAtDesc(documentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Scheduled(fixedDelay = 300000) // Runs every 5 minutes
    public void checkSlaBreaches() {
        LocalDate today = LocalDate.now();
        List<ApprovalWorkflow> overdue = approvalWorkflowRepository.findOverdueWorkflows(today);

        for (ApprovalWorkflow w : overdue) {
            // Log breach event under the system account
            auditService.log("system", w.getDocument(), "WORKFLOW_SLA_BREACH", "ApprovalWorkflow",
                    w.getId().toString(), "PENDING", "SLA breached (overdue). Due date was: " + w.getDueDate(), "system");
            
            // TODO: Wire real notification dispatch (e.g. emails, SMS, or internal notifications) here.
        }
    }

    private WorkflowResponse toResponse(ApprovalWorkflow w) {
        return WorkflowResponse.builder()
                .id(w.getId())
                .documentId(w.getDocument().getId())
                .documentTitle(w.getDocument().getTitle())
                .initiatedByUsername(w.getInitiatedBy().getEmail())
                .currentStep(w.getCurrentStep())
                .status(w.getStatus().name())
                .dueDate(w.getDueDate())
                .approvedByUsername(w.getApprovedBy() != null ? w.getApprovedBy().getEmail() : null)
                .decisionNote(w.getDecisionNote())
                .createdAt(w.getCreatedAt())
                .decidedAt(w.getDecidedAt())
                .build();
    }
}
