package com.dms.service;

import com.dms.service.AccessControlService;
import com.dms.service.DocumentService;
import com.dms.audit.AuditService;
import com.dms.dto.DocumentDTOs.DocumentResponse;
import com.dms.dto.DocumentDTOs.DocumentUploadRequest;
import com.dms.dto.DocumentDTOs.DocumentUpdateRequest;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DocumentServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private DocumentVersionRepository documentVersionRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private DocumentService documentService;

    @Test
    @DisplayName("Should successfully upload a document and save initial version info")
    void uploadSucceeds() {
        DocumentUploadRequest req = DocumentUploadRequest.builder()
                .title("Architectural Specs.pdf")
                .fileType("pdf")
                .fileSizeKb(2400)
                .storageUrl("https://storage.dms.com/specs.pdf")
                .changeSummary("Initial upload specs")
                .build();

        Users mockUser = Users.builder()
                .id(1L)
                .email("owner@dms.com")
                .role(Role.DOCUMENT_OWNER)
                .build();

        when(userRepository.findByEmail("owner@dms.com")).thenReturn(Optional.of(mockUser));

        DocumentResponse resp = documentService.upload(req, "owner@dms.com");

        assertNotNull(resp);
        assertEquals("Architectural Specs.pdf", resp.getTitle());
        assertEquals("owner@dms.com", resp.getOwnerUsername());
        assertEquals("DRAFT", resp.getStatus());
        assertEquals(1, resp.getCurrentVersion());

        verify(documentRepository, times(1)).save(any(Document.class));
        verify(documentVersionRepository, times(1)).save(any(DocumentVersion.class));
        verify(auditService, times(1)).log(eq("owner@dms.com"), any(Document.class), eq("UPLOAD_DOCUMENT"), eq("Document"), anyString(), any(), eq("Architectural Specs.pdf"), eq("system"));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when uploader email is not found")
    void uploadThrowsUserNotFound() {
        DocumentUploadRequest req = DocumentUploadRequest.builder()
                .title("Architectural Specs.pdf")
                .fileType("pdf")
                .fileSizeKb(2400)
                .storageUrl("https://storage.dms.com/specs.pdf")
                .build();

        when(userRepository.findByEmail("unknown@dms.com")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> documentService.upload(req, "unknown@dms.com"));
        verify(documentRepository, never()).save(any(Document.class));
    }

    @Test
    @DisplayName("Should increment document version and add a new DocumentVersion successfully")
    void createNewVersionSucceeds() {
        DocumentUpdateRequest req = DocumentUpdateRequest.builder()
                .fileType("pdf")
                .storageUrl("https://storage.dms.com/specs_v2.pdf")
                .changeSummary("Updated layout")
                .build();

        Users mockOwner = Users.builder()
                .id(1L)
                .email("owner@dms.com")
                .role(Role.DOCUMENT_OWNER)
                .build();

        Document mockDoc = Document.builder()
                .id(100L)
                .title("Architectural Specs.pdf")
                .owner(mockOwner)
                .currentVersion(1)
                .status(DocumentStatus.DRAFT)
                .build();

        when(documentRepository.findById(100L)).thenReturn(Optional.of(mockDoc));
        when(userRepository.findByEmail("owner@dms.com")).thenReturn(Optional.of(mockOwner));

        DocumentResponse resp = documentService.createNewVersion(100L, req, "owner@dms.com");

        assertNotNull(resp);
        assertEquals(2, resp.getCurrentVersion());
        assertEquals("https://storage.dms.com/specs_v2.pdf", resp.getStorageUrl());

        verify(documentRepository, times(1)).save(mockDoc);
        verify(documentVersionRepository, times(1)).save(any(DocumentVersion.class));
        verify(auditService, times(1)).log(eq("owner@dms.com"), eq(mockDoc), eq("DOCUMENT_NEW_VERSION"), eq("Document"), eq("100"), any(), eq("Version 2"), eq("system"));
    }

    @Test
    @DisplayName("Should throw UnauthorisedAccessException on createNewVersion when status is ARCHIVED or DELETED")
    void createNewVersionThrowsForArchivedOrDeleted() {
        DocumentUpdateRequest req = DocumentUpdateRequest.builder()
                .fileType("pdf")
                .storageUrl("https://storage.dms.com/specs_v2.pdf")
                .changeSummary("Updated layout")
                .build();

        Users mockOwner = Users.builder()
                .id(1L)
                .email("owner@dms.com")
                .role(Role.DOCUMENT_OWNER)
                .build();

        Document archivedDoc = Document.builder()
                .id(100L)
                .title("Architectural Specs.pdf")
                .owner(mockOwner)
                .currentVersion(1)
                .status(DocumentStatus.ARCHIVED)
                .build();

        when(documentRepository.findById(100L)).thenReturn(Optional.of(archivedDoc));
        when(userRepository.findByEmail("owner@dms.com")).thenReturn(Optional.of(mockOwner));

        assertThrows(UnauthorisedAccessException.class, () -> documentService.createNewVersion(100L, req, "owner@dms.com"));
        verify(documentRepository, never()).save(archivedDoc);
    }

    @Test
    @DisplayName("Should throw UnauthorisedAccessException on getById when user has no permissions")
    void getByIdThrowsForNoPermissions() {
        Users mockOwner = Users.builder()
                .id(1L)
                .email("owner@dms.com")
                .role(Role.DOCUMENT_OWNER)
                .build();

        Users caller = Users.builder()
                .id(2L)
                .email("caller@dms.com")
                .role(Role.GUEST)
                .build();

        Document mockDoc = Document.builder()
                .id(100L)
                .owner(mockOwner)
                .title("Confidential Document.pdf")
                .build();

        when(documentRepository.findById(100L)).thenReturn(Optional.of(mockDoc));
        when(userRepository.findByEmail("caller@dms.com")).thenReturn(Optional.of(caller));
        when(accessControlService.hasPermission(100L, 2L, Permission.VIEW)).thenReturn(false);

        assertThrows(UnauthorisedAccessException.class, () -> documentService.getById(100L, "caller@dms.com"));
    }

    @Test
    @DisplayName("Should bypass AccessControl check and succeed in getById when user is the owner")
    void getByIdSucceedsForOwner() {
        Users mockOwner = Users.builder()
                .id(1L)
                .email("owner@dms.com")
                .role(Role.DOCUMENT_OWNER)
                .build();

        Document mockDoc = Document.builder()
                .id(100L)
                .owner(mockOwner)
                .title("Confidential Document.pdf")
                .build();

        when(documentRepository.findById(100L)).thenReturn(Optional.of(mockDoc));
        when(userRepository.findByEmail("owner@dms.com")).thenReturn(Optional.of(mockOwner));

        DocumentResponse resp = documentService.getById(100L, "owner@dms.com");

        assertNotNull(resp);
        assertEquals("Confidential Document.pdf", resp.getTitle());
        verify(accessControlService, never()).hasPermission(anyLong(), anyLong(), any());
    }

    @Test
    @DisplayName("Should throw UnauthorisedAccessException on delete when caller is neither owner nor ADMIN")
    void deleteThrowsForUnauthorisedCaller() {
        Users mockOwner = Users.builder()
                .id(1L)
                .email("owner@dms.com")
                .role(Role.DOCUMENT_OWNER)
                .build();

        Users caller = Users.builder()
                .id(2L)
                .email("guest@dms.com")
                .role(Role.GUEST)
                .build();

        Document mockDoc = Document.builder()
                .id(100L)
                .owner(mockOwner)
                .status(DocumentStatus.DRAFT)
                .build();

        when(documentRepository.findById(100L)).thenReturn(Optional.of(mockDoc));
        when(userRepository.findByEmail("guest@dms.com")).thenReturn(Optional.of(caller));

        assertThrows(UnauthorisedAccessException.class, () -> documentService.delete(100L, "guest@dms.com"));
        verify(documentRepository, never()).save(any(Document.class));
    }
}
