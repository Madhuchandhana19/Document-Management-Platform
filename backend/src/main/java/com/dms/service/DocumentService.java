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
import com.dms.exception.DuplicateDocumentException;
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
    private final com.dms.repository.ApprovalWorkflowRepository approvalWorkflowRepository;
    private final NotificationService notificationService;

    private static final List<String> ALLOWED_FILE_TYPES = List.of("pdf", "docx", "xlsx", "txt", "png", "jpg", "fig", "zip");

    private static boolean diskFull = false;

    public static void setDiskFull(boolean full) {
        diskFull = full;
    }

    public static boolean isDiskFull() {
        return diskFull;
    }

    @Transactional
    public DocumentResponse upload(DocumentUploadRequest req, String username) {
        Users uploader = null;
        if (req.getOwnerId() != null) {
            uploader = userRepository.findById(req.getOwnerId())
                    .orElseThrow(() -> new IllegalArgumentException("Document owner is required"));
        }
        if (uploader == null && username != null && !username.trim().isEmpty()) {
            uploader = userRepository.findByEmail(username).orElse(null);
        }
        if (uploader == null) {
            throw new IllegalArgumentException("Document owner is required");
        }

        if (uploader.getRole() == Role.VIEWER || uploader.getRole() == Role.GUEST) {
            throw new UnauthorisedAccessException("Upload denied. Viewers and Guests are not permitted to upload documents.");
        }

        int fileSizeKb = req.getFileSizeKb() != null ? req.getFileSizeKb() : 1024;

        if (diskFull || fileSizeKb >= 102400) {
            try {
                notificationService.createNotification(com.dms.dto.NotificationDTO.NotificationCreateRequest.builder()
                        .userId(uploader.getId())
                        .message("Upload failed: insufficient storage space")
                        .detail("Storage quota exceeded when uploading " + (req.getTitle() != null ? req.getTitle() : "document"))
                        .type("SYSTEM")
                        .build());
            } catch (Exception e) {}
            throw new com.dms.exception.StorageQuotaExceededException("Storage quota exceeded. Contact administrator.");
        }

        if (fileSizeKb > 51200) {
            throw new IllegalArgumentException("File size must not exceed 50 MB");
        }

        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required");
        }

        String processedTitle = req.getTitle().trim();
        if (processedTitle.length() > 200) {
            processedTitle = processedTitle.substring(0, 197) + "...";
        }

        String checksum = computeChecksum(req.getStorageUrl());
        if (documentVersionRepository.existsByChecksum(checksum)) {
            throw new DuplicateDocumentException("This document already exists in the system.");
        }

        String typeClean = (req.getFileType() != null && !req.getFileType().trim().isEmpty())
                ? req.getFileType().trim().toLowerCase().replaceAll("^\\.", "")
                : "pdf";
        if (!ALLOWED_FILE_TYPES.contains(typeClean)) {
            throw new IllegalArgumentException("Unsupported file type. Allowed types: PDF, DOCX, XLSX, TXT, PNG, JPG, FIG, ZIP");
        }

        if (!InputSanitizer.isSafe(req.getTitle()) || (req.getChangeSummary() != null && !InputSanitizer.isSafe(req.getChangeSummary()))) {
            throw new IllegalArgumentException("Input contains unsafe content");
        }

        if (req.getRetentionPeriodYears() != null && req.getRetentionPeriodYears() <= 0) {
            throw new IllegalArgumentException("Retention period must be positive");
        }

        String category = (req.getCategory() != null && !req.getCategory().trim().isEmpty()) ? req.getCategory().trim() : "General";
        String accessLevel = (req.getAccessLevel() != null && !req.getAccessLevel().trim().isEmpty()) ? req.getAccessLevel().trim() : "Internal";
        int retentionYears = (req.getRetentionPeriodYears() != null && req.getRetentionPeriodYears() > 0) ? req.getRetentionPeriodYears() : 5;

        java.time.LocalDate retDate = req.getRetentionDate() != null ? req.getRetentionDate() : java.time.LocalDate.now().plusYears(retentionYears);

        Document document = Document.builder()
                .title(processedTitle)
                .folderId(req.getFolderId())
                .owner(uploader)
                .currentVersion(1)
                .fileType(typeClean)
                .fileSizeKb(fileSizeKb)
                .storageUrl(req.getStorageUrl())
                .status(DocumentStatus.DRAFT)
                .category(category)
                .accessLevel(accessLevel)
                .retentionPeriodYears(retentionYears)
                .retentionDate(retDate)
                .build();

        documentRepository.save(document);

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

        if (document.getStatus() == DocumentStatus.ARCHIVED) {
            throw new IllegalStateException("Archived documents are read-only and cannot be modified or deleted.");
        }

        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new UnauthorisedAccessException("Cannot create a new version for a DELETED document");
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

    @Transactional
    public DocumentResponse rollback(Long documentId, Integer targetVersionNo, String username) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        checkAccess(document, username, Permission.EDIT);

        if (document.getStatus() == DocumentStatus.ARCHIVED) {
            throw new IllegalStateException("Archived documents are read-only and cannot be modified or deleted.");
        }

        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new UnauthorisedAccessException("Cannot rollback a DELETED document");
        }

        DocumentVersion targetVersion = documentVersionRepository.findByDocumentIdOrderByVersionNoDesc(documentId)
                .stream()
                .filter(v -> v.getVersionNo().equals(targetVersionNo))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Target version " + targetVersionNo + " not found for document ID: " + documentId));

        Users user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        int newVersionNo = document.getCurrentVersion() + 1;
        document.setCurrentVersion(newVersionNo);
        document.setStorageUrl(targetVersion.getFileUrl());
        documentRepository.save(document);

        DocumentVersion newVersion = DocumentVersion.builder()
                .document(document)
                .versionNo(newVersionNo)
                .uploadedBy(user)
                .fileUrl(targetVersion.getFileUrl())
                .changeSummary("Rolled back to version " + targetVersionNo)
                .checksum(targetVersion.getChecksum())
                .build();

        documentVersionRepository.save(newVersion);

        auditService.log(username, document, "DOCUMENT_ROLLBACK", "Document",
                document.getId().toString(), "v" + targetVersionNo, "v" + newVersionNo, "system");

        return toResponse(document);
    }

    public List<DocumentVersionResponse> getVersions(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));
        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new ResourceNotFoundException("Document not found with ID: " + documentId);
        }
        return documentVersionRepository.findByDocumentIdOrderByVersionNoDesc(documentId)
                .stream()
                .map(this::toVersionResponse)
                .toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<DocumentResponse> search(String title, String status, Long ownerId, String username) {
        DocumentStatus docStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                docStatus = DocumentStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid status value: " + status);
            }
        }

        Users user = username != null ? userRepository.findByEmail(username).orElse(null) : null;
        List<Document> docs;

        if (user != null && user.getRole() == Role.ADMIN) {
            // ADMIN sees all documents system-wide
            docs = documentRepository.searchDocuments(title, docStatus, ownerId);
        } else if (user != null) {
            // Regular user sees only owned documents + non-expired shared documents
            docs = documentRepository.searchUserPermittedDocuments(title, docStatus, ownerId, user.getId(), java.time.LocalDate.now());
        } else {
            docs = documentRepository.searchDocuments(title, docStatus, ownerId);
        }

        return docs.stream()
                .map(this::toResponse)
                .toList();
    }

    public List<DocumentResponse> search(String title, String status, Long ownerId) {
        return search(title, status, ownerId, null);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public DocumentPaginatedResponse searchPaginated(String title, String status, Long ownerId, Integer page, Integer pageSize, String username) {
        List<DocumentResponse> allDocs = search(title, status, ownerId, username);
        int effectivePage = (page != null && page > 0) ? page : 1;
        int effectiveSize = (pageSize != null && pageSize > 0) ? pageSize : 50;
        int totalCount = allDocs.size();
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / effectiveSize);

        int startIndex = (effectivePage - 1) * effectiveSize;
        List<DocumentResponse> pageDocs;
        if (startIndex >= totalCount) {
            pageDocs = java.util.Collections.emptyList();
        } else {
            int endIndex = Math.min(startIndex + effectiveSize, totalCount);
            pageDocs = allDocs.subList(startIndex, endIndex);
        }

        return DocumentPaginatedResponse.builder()
                .documents(pageDocs)
                .totalCount(totalCount)
                .currentPage(effectivePage)
                .pageSize(effectiveSize)
                .totalPages(totalPages)
                .build();
    }

    public DocumentResponse getById(Long id, String username) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + id));
        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new ResourceNotFoundException("Document not found with ID: " + id);
        }
        checkAccess(document, username, Permission.VIEW);
        return toResponse(document);
    }

    @Transactional
    public void delete(Long documentId, String username) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        if (document.getStatus() == DocumentStatus.ARCHIVED) {
            throw new IllegalStateException("Archived documents are read-only and cannot be modified or deleted.");
        }

        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new ResourceNotFoundException("Document not found or already deleted");
        }

        Users user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        // Check if user is owner of the document or an ADMIN
        boolean isOwner = document.getOwner().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;

        // Keep the existing owner/admin check as-is (MANAGE-level)
        if (!isOwner && !isAdmin) {
            throw new UnauthorisedAccessException("Insufficient permissions. Only the owner or an ADMIN can delete this document");
        }

        document.setStatus(DocumentStatus.DELETED);
        documentRepository.save(document);

        auditService.log(username, document, "DOCUMENT_DELETE", "Document",
                document.getId().toString(), null, "Status updated to DELETED", "system");
    }

    private void checkAccess(Document document, String username, Permission required) {
        Users user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (user.getRole() == Role.ADMIN || user.getRole() == Role.COMPLIANCE_OFFICER) {
            return; // ADMIN and COMPLIANCE_OFFICER have full view & compliance reporting access
        }

        if (document.getOwner().getId().equals(user.getId())) {
            return; // Document owner has all permissions
        }

        if (required == Permission.VIEW && "PUBLIC".equalsIgnoreCase(document.getAccessLevel())) {
            return; // PUBLIC documents can be viewed by all users
        }

        if (required == Permission.VIEW) {
            boolean isAssignedApprover = approvalWorkflowRepository.findByDocumentId(document.getId()).stream()
                    .anyMatch(w -> w.getStatus() == com.dms.entity.WorkflowStatus.PENDING &&
                            w.getAssignedApprover() != null &&
                            w.getAssignedApprover().getId().equals(user.getId()));
            if (isAssignedApprover) {
                return; // Assigned approver has view access to review document
            }
        }

        // PROMPT 7.3 check: APPROVE permission does NOT grant EDIT rights
        if (required == Permission.EDIT) {
            boolean hasApproveOnly = accessControlService.hasPermission(document.getId(), user.getId(), Permission.APPROVE) &&
                                     !accessControlService.hasPermission(document.getId(), user.getId(), Permission.EDIT);
            if (hasApproveOnly) {
                throw new UnauthorisedAccessException("Insufficient permission. APPROVE allows workflow approval only.");
            }
        }

        boolean hasAccess = accessControlService.hasPermission(document.getId(), user.getId(), required);
        if (!hasAccess) {
            // Check if access expired (PROMPT 7.4)
            java.time.LocalDate expiredDate = accessControlService.getExpiredValidToDate(document.getId(), user.getId());
            if (expiredDate != null) {
                throw new UnauthorisedAccessException("Access denied. Your access to this document expired on " + expiredDate + ".");
            }
            throw new UnauthorisedAccessException("Insufficient permission for " + required + " action.");
        }
    }

    @Transactional
    public DocumentResponse updateMetadata(Long documentId, DocumentMetadataUpdateRequest req, String username) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        checkAccess(document, username, Permission.EDIT);

        if (document.getStatus() == DocumentStatus.ARCHIVED) {
            throw new IllegalStateException("Archived documents are read-only and cannot be modified or deleted.");
        }

        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required");
        }

        String processedTitle = req.getTitle().trim();
        if (processedTitle.length() > 200) {
            processedTitle = processedTitle.substring(0, 197) + "...";
        }

        if (!InputSanitizer.isSafe(req.getTitle())) {
            throw new IllegalArgumentException("Input contains unsafe content");
        }

        document.setTitle(processedTitle);
        if (req.getCategory() != null && !req.getCategory().trim().isEmpty()) {
            document.setCategory(req.getCategory().trim());
        }
        if (req.getAccessLevel() != null && !req.getAccessLevel().trim().isEmpty()) {
            document.setAccessLevel(req.getAccessLevel().trim());
        }
        if (req.getRetentionPeriodYears() != null && req.getRetentionPeriodYears() > 0) {
            document.setRetentionPeriodYears(req.getRetentionPeriodYears());
            document.setRetentionDate(java.time.LocalDate.now().plusYears(req.getRetentionPeriodYears()));
        }

        documentRepository.save(document);

        auditService.log(username, document, "DOCUMENT_METADATA_UPDATE", "Document",
                document.getId().toString(), null, "Metadata updated: " + req.getTitle(), "system");

        return toResponse(document);
    }

    @Transactional
    public DocumentResponse download(Long id, String username) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + id));

        checkAccess(document, username, Permission.VIEW);

        auditService.log(username, document, "DOCUMENT_DOWNLOAD", "Document",
                document.getId().toString(), null, "Downloaded version v" + document.getCurrentVersion(), "system");

        return toResponse(document);
    }

    @Transactional
    public byte[] exportPdf(Long id, String username) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + id));

        checkAccess(document, username, Permission.VIEW);

        auditService.log(username, document, "EXPORT_DOCUMENT_PDF", "Document",
                document.getId().toString(), null, "Exported document summary report to PDF format", "system");

        String pdfContent = "%PDF-1.4\n1 0 obj\n<< /Title (" + document.getTitle() + ") /Author (" + document.getOwner().getEmail() + ") >>\nendobj\n" +
                "2 0 obj\n<< /Length 100 >>\nstream\nDocument Export: " + document.getTitle() + "\nVersion: v" + document.getCurrentVersion() + "\nStatus: " + document.getStatus() + "\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";

        return pdfContent.getBytes(StandardCharsets.UTF_8);
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
                .category(d.getCategory() != null ? d.getCategory() : "General")
                .accessLevel(d.getAccessLevel() != null ? d.getAccessLevel() : "Internal")
                .retentionPeriodYears(d.getRetentionPeriodYears() != null ? d.getRetentionPeriodYears() : 5)
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
            String input = (storageUrl != null && !storageUrl.trim().isEmpty()) ? storageUrl.trim() : "default-storage-content";
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
            return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        }
    }
}
