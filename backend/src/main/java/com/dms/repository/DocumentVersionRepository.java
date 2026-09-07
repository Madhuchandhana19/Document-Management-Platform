package com.dms.repository;

import com.dms.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {
    List<DocumentVersion> findByDocumentIdOrderByVersionNoDesc(Long documentId);
    Optional<DocumentVersion> findByDocumentIdAndVersionNo(Long documentId, Integer versionNo);
}
