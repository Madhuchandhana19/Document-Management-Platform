package com.dms.service;

import com.dms.audit.AuditService;
import com.dms.dto.AccessControlDTOs.*;
import com.dms.entity.AccessControl;
import com.dms.entity.Permission;
import com.dms.entity.Document;
import com.dms.entity.Role;
import com.dms.entity.Users;
import com.dms.exception.ResourceNotFoundException;
import com.dms.exception.UnauthorisedAccessException;
import com.dms.repository.AccessControlRepository;
import com.dms.repository.DocumentRepository;
import com.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccessControlService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final AccessControlRepository accessControlRepository;
    private final AuditService auditService;

    @Transactional
    public AccessControlResponse grant(Long documentId, GrantAccessRequest req, String grantedByUsername) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        Users targetUser = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found with ID: " + req.getUserId()));

        Users granter = userRepository.findByEmail(grantedByUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Granter user not found: " + grantedByUsername));

        // Security check: Only the document owner or an ADMIN may grant access
        boolean isOwner = document.getOwner().getId().equals(granter.getId());
        boolean isAdmin = granter.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new UnauthorisedAccessException("Only the document owner or an ADMIN can grant access permissions");
        }

        Permission permission;
        try {
            permission = Permission.valueOf(req.getPermission().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid permission value: " + req.getPermission());
        }

        AccessControl accessControl = AccessControl.builder()
                .document(document)
                .user(targetUser)
                .permission(permission)
                .grantedBy(granter)
                .validFrom(LocalDate.now())
                .validTo(req.getValidTo())
                .build();

        accessControlRepository.save(accessControl);

        // Audit Log
        auditService.log(grantedByUsername, document, "ACCESS_GRANT", "AccessControl",
                accessControl.getId().toString(), null, permission.name() + " to " + targetUser.getEmail(), "system");

        return toResponse(accessControl);
    }

    @Transactional
    public void revoke(Long documentId, RevokeAccessRequest req, String revokedByUsername) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        Users revoker = userRepository.findByEmail(revokedByUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Revoker user not found: " + revokedByUsername));

        // Security check: Only the document owner or an ADMIN may revoke access
        boolean isOwner = document.getOwner().getId().equals(revoker.getId());
        boolean isAdmin = revoker.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new UnauthorisedAccessException("Only the document owner or an ADMIN can revoke access permissions");
        }

        Permission permission;
        try {
            permission = Permission.valueOf(req.getPermission().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid permission value: " + req.getPermission());
        }

        AccessControl accessControl = accessControlRepository.findByDocumentIdAndUserIdAndPermission(documentId, req.getUserId(), permission)
                .orElseThrow(() -> new ResourceNotFoundException("Access control mapping not found for permission " + permission + " on document " + documentId + " and user " + req.getUserId()));

        accessControlRepository.delete(accessControl);

        // Audit Log
        auditService.log(revokedByUsername, document, "ACCESS_REVOKE", "AccessControl",
                accessControl.getId().toString(), permission.name() + " for " + accessControl.getUser().getEmail(), null, "system");
    }

    public List<AccessControlResponse> list(Long documentId) {
        if (!documentRepository.existsById(documentId)) {
            throw new ResourceNotFoundException("Document not found with ID: " + documentId);
        }
        return accessControlRepository.findByDocumentId(documentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public boolean hasPermission(Long documentId, Long userId, Permission permission) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        // Document owner has all permissions
        if (doc.getOwner().getId().equals(userId)) {
            return true;
        }

        LocalDate today = LocalDate.now();
        List<AccessControl> aclList = accessControlRepository.findByDocumentId(documentId);

        return aclList.stream()
                .filter(a -> a.getUser().getId().equals(userId))
                .filter(a -> !a.getValidFrom().isAfter(today))
                .filter(a -> a.getValidTo() == null || !a.getValidTo().isBefore(today))
                .anyMatch(a -> satisfiesPermission(a.getPermission(), permission));
    }

    private boolean satisfiesPermission(Permission granted, Permission required) {
        if (granted == required) return true;
        if (granted == Permission.MANAGE) return true;
        if (granted == Permission.APPROVE && (required == Permission.EDIT || required == Permission.VIEW)) return true;
        if (granted == Permission.EDIT && required == Permission.VIEW) return true;
        return false;
    }

    private AccessControlResponse toResponse(AccessControl a) {
        return AccessControlResponse.builder()
                .id(a.getId())
                .documentId(a.getDocument().getId())
                .username(a.getUser().getEmail())
                .permission(a.getPermission().name())
                .grantedByUsername(a.getGrantedBy().getEmail())
                .validFrom(a.getValidFrom())
                .validTo(a.getValidTo())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
