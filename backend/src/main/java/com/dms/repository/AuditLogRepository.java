package com.dms.repository;

import com.dms.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByUserId(Long userId, Pageable pageable);
    Page<AuditLog> findByEntityType(String entityType, Pageable pageable);
    Page<AuditLog> findByDocument_Id(Long documentId, Pageable pageable);
    Page<AuditLog> findByTimestampBetween(java.time.LocalDateTime start, java.time.LocalDateTime end, Pageable pageable);
    Page<AuditLog> findByDocument_IdAndTimestampBetween(Long documentId, java.time.LocalDateTime start, java.time.LocalDateTime end, Pageable pageable);

    @Query(value = "SELECT * FROM audit_log ORDER BY id DESC LIMIT 1", nativeQuery = true)
    Optional<AuditLog> findLatestEntry();
}
