package com.dms.service;

import com.dms.audit.AuditService;
import com.dms.dto.DocumentDTOs.*;
import com.dms.entity.AccessControl;
import com.dms.entity.Document;
import com.dms.entity.DocumentStatus;
import com.dms.entity.DocumentVersion;
import com.dms.entity.Permission;
import com.dms.entity.Role;
import com.dms.entity.Users;
import com.dms.exception.ResourceNotFoundException;
import com.dms.exception.UnauthorisedAccessException;
import com.dms.repository.DocumentRepository;
import com.dms.repository.DocumentVersionRepository;
import com.dms.repository.UserRepository;
import com.dms.security.InputSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final AuditService auditService;
    private final AccessControlService accessControlService;

    @Transactional
    public DocumentResponse upload(DocumentUploadRequest req, String username) {
        Users uploader = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Uploader user not found: " + username));

        // Note: fileSizeKb max validation of 50MB (50000 KB) is also enforced by @Max on DTO.
        // We will perform an extra programmatic check just in case.
        if (req.getFileSizeKb() > 50000) {
            throw new IllegalArgumentException("File size must not exceed 50 MB");
        }

        if (!InputSanitizer.isSafe(req.getTitle()) || !InputSanitizer.isSafe(req.getChangeSummary())) {
            throw new IllegalArgumentException("Input contains unsafe content");
        }

        Document document = Document.builder()
                .title(req.getTitle())
                .folderId(req.getFolderId())
                .owner(uploader)
                .currentVersion(1)
                .fileType(req.getFileType())
                .fileSizeKb(req.getFileSizeKb())
                .storageUrl(req.getStorageUrl())
                .status(DocumentStatus.DRAFT)
                .build();

        documentRepository.save(document);

        String checksum = computeChecksum(req.getStorageUrl());

        String summary = req.getChangeSummary() != null && !req.getChangeSummary().trim().isEmpty()
                ? req.getChangeSummary()
                : "Initial upload";

        DocumentVersion version = DocumentVersion.builder()
                .document(document)
                .versionNo(1)
                .uploadedBy(uploader)
                .fileUrl(req.getStorageUrl())
                .changeSummary(summary)
                .checksum(checksum)
                .build();

        documentVersionRepository.save(version);

        String docId = document.getId() != null ? document.getId().toString() : "0";
        auditService.log(username, document, "UPLOAD_DOCUMENT", "Document",
                docId, null, req.getTitle(), "system");

        return toResponse(document);
    }

    @Transactional
    public DocumentResponse createNewVersion(Long documentId, DocumentUpdateRequest req, String username) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        checkAccess(document, username, Permission.EDIT);

        if (!InputSanitizer.isSafe(req.getChangeSummary())) {
            throw new IllegalArgumentException("Input contains unsafe content");
        }

        if (document.getStatus() == DocumentStatus.DELETED || document.getStatus() == DocumentStatus.ARCHIVED) {
            throw new UnauthorisedAccessException("Cannot create a new version for a DELETED or ARCHIVED document");
        }

        Users uploader = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Uploader user not found: " + username));

        int newVersionNo = document.getCurrentVersion() + 1;
        document.setCurrentVersion(newVersionNo);
        document.setFileType(req.getFileType());
        document.setStorageUrl(req.getStorageUrl());
        documentRepository.save(document);

        String checksum = computeChecksum(req.getStorageUrl());

        DocumentVersion version = DocumentVersion.builder()
                .document(document)
                .versionNo(newVersionNo)
                .uploadedBy(uploader)
                .fileUrl(req.getStorageUrl())
                .changeSummary(req.getChangeSummary())
                .checksum(checksum)
                .build();

        documentVersionRepository.save(version);

        auditService.log(username, document, "DOCUMENT_NEW_VERSION", "Document",
                document.getId().toString(), null, "Version " + newVersionNo, "system");

        return toResponse(document);
    }

    public List<DocumentVersionResponse> getVersions(Long documentId) {
        // Note: No checkAccess check is needed here. List-level search endpoints are
        // role-gated via @PreAuthorize in the Controller.
        // Check if document exists
        if (!documentRepository.existsById(documentId)) {
            throw new ResourceNotFoundException("Document not found with ID: " + documentId);
        }
        return documentVersionRepository.findByDocumentIdOrderByVersionNoDesc(documentId)
                .stream()
                .map(this::toVersionResponse)
                .toList();
    }

    public List<DocumentResponse> search(String title, String status, Long ownerId) {
        // Note: No checkAccess check is needed here. Search queries return list-level entries,
        // and access controls are role-gated by @PreAuthorize on the endpoint level.
        DocumentStatus docStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                docStatus = DocumentStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid status value: " + status);
            }
        }
        List<Document> docs = documentRepository.searchDocuments(title, docStatus, ownerId);
        return docs.stream()
                .map(this::toResponse)
                .toList();
    }

    public DocumentResponse getById(Long id, String username) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + id));
        checkAccess(document, username, Permission.VIEW);
        return toResponse(document);
    }

    @Transactional
    public void delete(Long documentId, String username) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        Users user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        // Check if user is owner of the document or an ADMIN
        boolean isOwner = document.getOwner().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;

        // Keep the existing owner/admin check as-is (MANAGE-level)
        if (!isOwner && !isAdmin) {
            throw new UnauthorisedAccessException("Only the owner or an ADMIN can delete this document");
        }

        document.setStatus(DocumentStatus.DELETED);
        documentRepository.save(document);

        auditService.log(username, document, "DOCUMENT_DELETE", "Document",
                document.getId().toString(), null, "Status updated to DELETED", "system");
    }

    private void checkAccess(Document document, String username, Permission required) {
        Users user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (user.getRole() == Role.ADMIN) {
            return; // ADMIN has all permissions
        }

        if (document.getOwner().getId().equals(user.getId())) {
            return; // Document owner has all permissions
        }

        boolean hasAccess = accessControlService.hasPermission(document.getId(), user.getId(), required);
        if (!hasAccess) {
            throw new UnauthorisedAccessException("User " + username + " does not have " + required + " permission on document " + document.getId());
        }
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

    private DocumentVersionResponse toVersionResponse(DocumentVersion v) {
        return DocumentVersionResponse.builder()
                .id(v.getId())
                .versionNo(v.getVersionNo())
                .uploadedByUsername(v.getUploadedBy().getEmail())
                .fileUrl(v.getFileUrl())
                .changeSummary(v.getChangeSummary())
                .createdAt(v.getCreatedAt())
                .checksum(v.getChecksum())
                .build();
    }

    private String computeChecksum(String storageUrl) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String input = storageUrl + System.currentTimeMillis();
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            return "checksum-fallback-" + System.currentTimeMillis();
        }
    }
}
