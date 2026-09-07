package com.dms.repository;

import com.dms.entity.AccessControl;
import com.dms.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccessControlRepository extends JpaRepository<AccessControl, Long> {
    List<AccessControl> findByDocumentId(Long documentId);
    List<AccessControl> findByUserId(Long userId);
    Optional<AccessControl> findByDocumentIdAndUserIdAndPermission(Long documentId, Long userId, Permission permission);

    @Query("SELECT a FROM AccessControl a WHERE a.document.id = :documentId AND a.user.id = :userId AND " +
           "a.validFrom <= :today AND (a.validTo IS NULL OR a.validTo >= :today) AND " +
           "((:permission = com.dms.entity.Permission.VIEW AND a.permission IN (com.dms.entity.Permission.VIEW, com.dms.entity.Permission.EDIT, com.dms.entity.Permission.APPROVE, com.dms.entity.Permission.MANAGE)) OR " +
           "(:permission = com.dms.entity.Permission.EDIT AND a.permission IN (com.dms.entity.Permission.EDIT, com.dms.entity.Permission.APPROVE, com.dms.entity.Permission.MANAGE)) OR " +
           "(:permission = com.dms.entity.Permission.APPROVE AND a.permission IN (com.dms.entity.Permission.APPROVE, com.dms.entity.Permission.MANAGE)) OR " +
           "(:permission = com.dms.entity.Permission.MANAGE AND a.permission = com.dms.entity.Permission.MANAGE))")
    Optional<AccessControl> checkPermission(@Param("documentId") Long documentId,
                                            @Param("userId") Long userId,
                                            @Param("permission") Permission permission,
                                            @Param("today") LocalDate today);
}
