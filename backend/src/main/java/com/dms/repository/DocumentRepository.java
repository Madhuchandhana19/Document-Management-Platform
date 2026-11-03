package com.dms.repository;

import com.dms.entity.Document;
import com.dms.entity.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByOwnerId(Long ownerId);
    List<Document> findByStatus(DocumentStatus status);
    List<Document> findByTitleContainingIgnoreCase(String title);
    List<Document> findByFolderId(Long folderId);
    List<Document> findByRetentionDateBefore(LocalDate date);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.owner WHERE " +
           "(:title IS NULL OR :title = '' OR LOWER(d.title) LIKE CONCAT('%', LOWER(CAST(:title AS string)), '%')) AND " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(:ownerId IS NULL OR d.owner.id = :ownerId)")
    List<Document> searchDocuments(@Param("title") String title,
                                   @Param("status") DocumentStatus status,
                                   @Param("ownerId") Long ownerId);

    @Query("SELECT DISTINCT d FROM Document d LEFT JOIN FETCH d.owner WHERE " +
           "(:title IS NULL OR :title = '' OR LOWER(d.title) LIKE CONCAT('%', LOWER(CAST(:title AS string)), '%')) AND " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(:ownerId IS NULL OR d.owner.id = :ownerId) AND " +
           "(d.owner.id = :userId OR d.id IN (SELECT a.document.id FROM AccessControl a WHERE a.user.id = :userId AND (a.validFrom IS NULL OR a.validFrom <= :today) AND (a.validTo IS NULL OR a.validTo >= :today)))")
    List<Document> searchUserPermittedDocuments(@Param("title") String title,
                                                @Param("status") DocumentStatus status,
                                                @Param("ownerId") Long ownerId,
                                                @Param("userId") Long userId,
                                                @Param("today") LocalDate today);

    @Query("SELECT d FROM Document d WHERE d.retentionDate >= :start AND d.retentionDate <= :end AND d.status NOT IN (com.dms.entity.DocumentStatus.ARCHIVED, com.dms.entity.DocumentStatus.DELETED)")
    List<Document> findUpcomingRetention(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT d FROM Document d WHERE d.retentionDate < :today AND d.status NOT IN (com.dms.entity.DocumentStatus.ARCHIVED, com.dms.entity.DocumentStatus.DELETED)")
    List<Document> findExpiredDocuments(@Param("today") LocalDate today);
}
