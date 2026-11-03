package com.dms.service;

import com.dms.audit.AuditService;
import com.dms.dto.DocumentDTOs.DocumentResponse;
import com.dms.entity.Document;
import com.dms.entity.DocumentStatus;
import com.dms.entity.Role;
import com.dms.entity.Users;
import com.dms.exception.ResourceNotFoundException;
import com.dms.exception.UnauthorisedAccessException;
import com.dms.repository.DocumentRepository;
import com.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RetentionService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final AuditService auditService;

    @Transactional
    public void setPolicy(Long documentId, LocalDate retentionDate, String username) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        Users user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        boolean isOwner = document.getOwner().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new UnauthorisedAccessException("Only the document owner or an ADMIN can set retention policies");
        }

        document.setRetentionDate(retentionDate);
        documentRepository.save(document);

        auditService.log(username, document, "RETENTION_POLICY_SET", "Document",
                document.getId().toString(), null, "Retention date set to: " + retentionDate, "system");
    }

    public List<DocumentResponse> getUpcoming(int daysAhead) {
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(daysAhead);

        return documentRepository.findUpcomingRetention(start, end)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Scheduled(fixedDelay = 3600000) // Runs every hour
    @Transactional
    public int autoArchiveExpiredDocuments() {
        LocalDate today = LocalDate.now();
        List<Document> expiredDocs = documentRepository.findExpiredDocuments(today);
        int archivedCount = 0;

        for (Document d : expiredDocs) {
            d.setStatus(DocumentStatus.ARCHIVED);
            documentRepository.save(d);

            auditService.log("system", d, "AUTO_ARCHIVE", "Document",
                    d.getId().toString(), "EXPIRED", "Automatically archived based on retention date policy", "system");

            archivedCount++;
        }
        return archivedCount;
    }

    private DocumentResponse toResponse(Document d) {
        return DocumentResponse.builder()
                .id(d.getId())
                .title(d.getTitle())
                .folderId(d.getFolderId())
                .ownerUsername(d.getOwner().getEmail())
                .currentVersion(d.getCurrentVersion())
                .fileType(d.getFileType())
                .fileSizeKb(d.getFileSizeKb())
                .storageUrl(d.getStorageUrl())
                .status(d.getStatus().name())
                .retentionDate(d.getRetentionDate())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
