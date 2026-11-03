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

        if (req.getUserId() == null && (req.getUserEmail() == null || req.getUserEmail().trim().isEmpty())) {
            throw new IllegalArgumentException("User ID is required");
        }

        Users targetUser = null;
        if (req.getUserId() != null) {
            targetUser = userRepository.findById(req.getUserId()).orElse(null);
        }
        if (targetUser == null && req.getUserEmail() != null) {
            targetUser = userRepository.findByEmail(req.getUserEmail().trim().toLowerCase()).orElse(null);
        }
        if (targetUser == null) {
            throw new ResourceNotFoundException("Target user not found");
        }

        Users granter = userRepository.findByEmail(grantedByUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Granter user not found: " + grantedByUsername));

        // Security check: Only document owner, ADMIN, or user with MANAGE permission may grant access
        boolean isOwner = document.getOwner().getId().equals(granter.getId());
        boolean isAdmin = granter.getRole() == Role.ADMIN;
        boolean hasManage = accessControlRepository.findByDocumentId(documentId).stream()
                .filter(a -> a.getUser().getId().equals(granter.getId()))
                .filter(a -> !a.getValidFrom().isAfter(LocalDate.now()))
                .filter(a -> a.getValidTo() == null || !a.getValidTo().isBefore(LocalDate.now()))
                .anyMatch(a -> a.getPermission() == Permission.MANAGE);

        if (!isOwner && !isAdmin && !hasManage) {
            throw new UnauthorisedAccessException("Insufficient permission. EDIT allows changes only, not permission management.");
        }

        Permission permission;
        try {
            permission = Permission.valueOf(req.getPermission().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid permission. Must be one of: VIEW, EDIT, APPROVE, MANAGE");
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

        // Audit Log matching SRS format: "owner@dms.com granted VIEW to alice@dms.com"
        String auditMessage = granter.getEmail() + " granted " + permission.name() + " to " + targetUser.getEmail();
        auditService.log(grantedByUsername, document, "ACCESS_GRANT", "AccessControl",
                accessControl.getId().toString(), null, auditMessage, "system");

        return toResponse(accessControl);
    }

    @Transactional
    public void revoke(Long documentId, RevokeAccessRequest req, String revokedByUsername) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        Users revoker = userRepository.findByEmail(revokedByUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Revoker user not found: " + revokedByUsername));

        // Security check: Only document owner, ADMIN, or user with MANAGE permission may revoke access
        boolean isOwner = document.getOwner().getId().equals(revoker.getId());
        boolean isAdmin = revoker.getRole() == Role.ADMIN;
        boolean hasManage = accessControlRepository.findByDocumentId(documentId).stream()
                .filter(a -> a.getUser().getId().equals(revoker.getId()))
                .filter(a -> !a.getValidFrom().isAfter(LocalDate.now()))
                .filter(a -> a.getValidTo() == null || !a.getValidTo().isBefore(LocalDate.now()))
                .anyMatch(a -> a.getPermission() == Permission.MANAGE);

        if (!isOwner && !isAdmin && !hasManage) {
            throw new UnauthorisedAccessException("Insufficient permission. EDIT allows changes only, not permission management.");
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
        String auditMessage = revoker.getEmail() + " revoked " + permission.name() + " for " + accessControl.getUser().getEmail();
        auditService.log(revokedByUsername, document, "ACCESS_REVOKE", "AccessControl",
                accessControl.getId().toString(), permission.name() + " for " + accessControl.getUser().getEmail(), auditMessage, "system");
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

    public LocalDate getExpiredValidToDate(Long documentId, Long userId) {
        List<AccessControl> aclList = accessControlRepository.findByDocumentId(documentId);
        LocalDate today = LocalDate.now();
        return aclList.stream()
                .filter(a -> a.getUser().getId().equals(userId))
                .filter(a -> a.getValidTo() != null && a.getValidTo().isBefore(today))
                .map(AccessControl::getValidTo)
                .findFirst()
                .orElse(null);
    }

    private boolean satisfiesPermission(Permission granted, Permission required) {
        if (granted == required) return true;
        if (granted == Permission.MANAGE) return true;
        if (granted == Permission.APPROVE && required == Permission.VIEW) return true;
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
