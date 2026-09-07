package com.dms.config;

import com.dms.entity.*;
import com.dms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final ApprovalWorkflowRepository approvalWorkflowRepository;
    private final AccessControlRepository accessControlRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() > 0) {
            System.out.println("Database already seeded. Skipping seeder...");
            return;
        }

        System.out.println("Seeding initial demo data for Document Management System...");

        String defaultPassword = "Password123!";
        String encodedPassword = passwordEncoder.encode(defaultPassword);

        // 1. Create Users
        Users admin = Users.builder()
                .name("Alice Admin")
                .email("admin@dms.com")
                .phoneNumber("1234567890")
                .passwordHash(encodedPassword)
                .role(Role.ADMIN)
                .isActive(true)
                .build();

        Users owner = Users.builder()
                .name("Bob Owner")
                .email("owner@dms.com")
                .phoneNumber("1234567891")
                .passwordHash(encodedPassword)
                .role(Role.DOCUMENT_OWNER)
                .isActive(true)
                .build();

        Users editor = Users.builder()
                .name("Charlie Editor")
                .email("editor@dms.com")
                .phoneNumber("1234567892")
                .passwordHash(encodedPassword)
                .role(Role.EDITOR)
                .isActive(true)
                .build();

        Users approver = Users.builder()
                .name("David Approver")
                .email("approver@dms.com")
                .phoneNumber("1234567893")
                .passwordHash(encodedPassword)
                .role(Role.APPROVER)
                .isActive(true)
                .build();

        Users viewer = Users.builder()
                .name("Emily Viewer")
                .email("viewer@dms.com")
                .phoneNumber("1234567894")
                .passwordHash(encodedPassword)
                .role(Role.VIEWER)
                .isActive(true)
                .build();

        Users compliance = Users.builder()
                .name("Frank Compliance")
                .email("compliance@dms.com")
                .phoneNumber("1234567895")
                .passwordHash(encodedPassword)
                .role(Role.COMPLIANCE_OFFICER)
                .isActive(true)
                .build();

        Users guest = Users.builder()
                .name("Grace Guest")
                .email("guest@dms.com")
                .phoneNumber("1234567896")
                .passwordHash(encodedPassword)
                .role(Role.GUEST)
                .isActive(true)
                .build();

        userRepository.save(admin);
        userRepository.save(owner);
        userRepository.save(editor);
        userRepository.save(approver);
        userRepository.save(viewer);
        userRepository.save(compliance);
        userRepository.save(guest);

        // 2. Create Sample Documents owned by owner
        Document doc1 = Document.builder()
                .title("DMS Project Architecture.pdf")
                .owner(owner)
                .fileType("pdf")
                .fileSizeKb(1250)
                .storageUrl("https://storage.dms.com/files/arch.pdf")
                .status(DocumentStatus.UNDER_REVIEW)
                .retentionDate(LocalDate.now().plusYears(5))
                .build();

        Document doc2 = Document.builder()
                .title("Q2 Financial Report.xlsx")
                .owner(owner)
                .fileType("xlsx")
                .fileSizeKb(450)
                .storageUrl("https://storage.dms.com/files/q2_finance.xlsx")
                .status(DocumentStatus.DRAFT)
                .retentionDate(LocalDate.now().plusMonths(6))
                .build();

        Document doc3 = Document.builder()
                .title("Company Security Guidelines.docx")
                .owner(owner)
                .fileType("docx")
                .fileSizeKb(2400)
                .storageUrl("https://storage.dms.com/files/security_guidelines.docx")
                .status(DocumentStatus.DRAFT)
                .retentionDate(LocalDate.now().plusYears(10))
                .build();

        documentRepository.save(doc1);
        documentRepository.save(doc2);
        documentRepository.save(doc3);

        // 3. Create initial DocumentVersions
        DocumentVersion ver1 = DocumentVersion.builder()
                .document(doc1)
                .versionNo(1)
                .uploadedBy(owner)
                .fileUrl(doc1.getStorageUrl())
                .changeSummary("Initial architecture draft")
                .checksum("8f47c34b12356cde8f12a321cf78de19b22a1109a90cdcf8a8b1c1d1e1f1a1b1")
                .build();

        DocumentVersion ver2 = DocumentVersion.builder()
                .document(doc2)
                .versionNo(1)
                .uploadedBy(owner)
                .fileUrl(doc2.getStorageUrl())
                .changeSummary("Q2 figures seeder import")
                .checksum("b1a1f1e1d1c1b1a8fcdcd09a901109a228fde78cf321a128fc12356cde8f47c3")
                .build();

        DocumentVersion ver3 = DocumentVersion.builder()
                .document(doc3)
                .versionNo(1)
                .uploadedBy(owner)
                .fileUrl(doc3.getStorageUrl())
                .changeSummary("Draft template")
                .checksum("9a90cdcf8a8b1c1d1e1f1a1b18f47c34b12356cde8f12a321cf78de19b22a110")
                .build();

        documentVersionRepository.save(ver1);
        documentVersionRepository.save(ver2);
        documentVersionRepository.save(ver3);

        // 4. Create 1 ApprovalWorkflow in PENDING status on doc1
        ApprovalWorkflow workflow = ApprovalWorkflow.builder()
                .document(doc1)
                .initiatedBy(owner)
                .currentStep(1)
                .status(WorkflowStatus.PENDING)
                .dueDate(LocalDate.now().plusDays(7))
                .build();

        approvalWorkflowRepository.save(workflow);

        // 5. Create 1 AccessControl grant giving the EDITOR user EDIT permission on doc2
        AccessControl grant = AccessControl.builder()
                .document(doc2)
                .user(editor)
                .permission(Permission.EDIT)
                .grantedBy(owner)
                .validFrom(LocalDate.now())
                .build();

        accessControlRepository.save(grant);

        // 6. Print seeder summary
        System.out.println("=======================================================================");
        System.out.println("                     DMS BACKEND DEMO SEEDED CREDENTIALS               ");
        System.out.println("=======================================================================");
        System.out.println("Use the following credentials in Swagger UI to test the application.");
        System.out.println("Common password for all users is: " + defaultPassword);
        System.out.println();
        System.out.println("  1. ADMIN Role:");
        System.out.println("     - Email: admin@dms.com");
        System.out.println("  2. DOCUMENT OWNER Role:");
        System.out.println("     - Email: owner@dms.com");
        System.out.println("  3. EDITOR Role:");
        System.out.println("     - Email: editor@dms.com");
        System.out.println("  4. APPROVER Role:");
        System.out.println("     - Email: approver@dms.com");
        System.out.println("  5. VIEWER Role:");
        System.out.println("     - Email: viewer@dms.com");
        System.out.println("=======================================================================");
    }
}
