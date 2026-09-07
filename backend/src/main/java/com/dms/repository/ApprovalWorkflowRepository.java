package com.dms.repository;

import com.dms.entity.ApprovalWorkflow;
import com.dms.entity.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ApprovalWorkflowRepository extends JpaRepository<ApprovalWorkflow, Long> {
    List<ApprovalWorkflow> findByDocumentId(Long documentId);
    List<ApprovalWorkflow> findByDocumentIdOrderByCreatedAtDesc(Long documentId);
    List<ApprovalWorkflow> findByStatus(WorkflowStatus status);
    List<ApprovalWorkflow> findByInitiatedById(Long userId);

    @Query("SELECT w FROM ApprovalWorkflow w WHERE w.status = com.dms.entity.WorkflowStatus.PENDING AND w.dueDate < :today")
    List<ApprovalWorkflow> findOverdueWorkflows(@Param("today") LocalDate today);
}
