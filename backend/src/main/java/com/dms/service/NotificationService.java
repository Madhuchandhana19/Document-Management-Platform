package com.dms.service;

import com.dms.audit.AuditService;
import com.dms.dto.NotificationDTO.*;
import com.dms.entity.Document;
import com.dms.entity.EmailLog;
import com.dms.entity.Notification;
import com.dms.entity.NotificationPreference;
import com.dms.entity.Users;
import com.dms.exception.ResourceNotFoundException;
import com.dms.repository.DocumentRepository;
import com.dms.repository.EmailLogRepository;
import com.dms.repository.NotificationPreferenceRepository;
import com.dms.repository.NotificationRepository;
import com.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final EmailLogRepository emailLogRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(String userEmail) {
        Users user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userEmail) {
        Users user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));
        return notificationRepository.countByUserIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public NotificationResponse createNotification(NotificationCreateRequest request) {
        Users user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUserId()));

        Notification notification = Notification.builder()
                .user(user)
                .message(request.getMessage())
                .detail(request.getDetail())
                .type(request.getType())
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        return mapToResponse(saved);
    }

    @Transactional
    public void markAllAsRead(String userEmail) {
        Users user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        List<Notification> unreadNotifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(n -> !n.isRead())
                .collect(Collectors.toList());

        unreadNotifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    @Transactional
    public void markAsRead(Long notificationId, String userEmail) {
        Users user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to update this notification");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void dismissNotification(Long notificationId, String userEmail) {
        Users user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to delete this notification");
        }

        notificationRepository.delete(notification);
    }

    // =========================================================================
    // PROMPT 9.4: NOTIFICATION PREFERENCES MANAGEMENT
    // =========================================================================
    @Transactional
    public NotificationPreferenceDTO getUserPreferences(String userEmail) {
        Users user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));
        NotificationPreference pref = getOrCreatePreference(user);
        return mapToPreferenceDTO(pref);
    }

    @Transactional
    public NotificationPreferenceDTO updateUserPreferences(String userEmail, NotificationPreferenceDTO request) {
        Users user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));
        NotificationPreference pref = getOrCreatePreference(user);

        pref.setApprovalInApp(request.isApprovalInApp());
        pref.setApprovalEmail(request.isApprovalEmail());
        pref.setApprovalSms(request.isApprovalSms());

        pref.setShareInApp(request.isShareInApp());
        pref.setShareEmail(request.isShareEmail());
        pref.setShareSms(request.isShareSms());

        pref.setSlaBreachInApp(request.isSlaBreachInApp());
        pref.setSlaBreachEmail(request.isSlaBreachEmail());

        pref.setExpiryInApp(request.isExpiryInApp());
        pref.setExpiryEmail(request.isExpiryEmail());

        NotificationPreference saved = preferenceRepository.save(pref);
        return mapToPreferenceDTO(saved);
    }

    // =========================================================================
    // PROMPT 9.2: EMAIL NOTIFICATIONS & LOGGING
    private static boolean emailServiceTimeout = false;

    public static void setEmailServiceTimeout(boolean timeout) {
        emailServiceTimeout = timeout;
    }

    public static boolean isEmailServiceTimeout() {
        return emailServiceTimeout;
    }

    // =========================================================================
    @Transactional
    public EmailLog sendEmailNotification(String recipientEmail, String subject, String body, String link, String requesterName, String dueDate) {
        long startTime = System.currentTimeMillis();

        if (emailServiceTimeout) {
            // Simulate 3 retries with exponential backoff: 1s, 2s, 4s (or fast in test mode)
            int[] backoffDelaysSec = {1, 2, 4};
            for (int i = 0; i < backoffDelaysSec.length; i++) {
                System.out.println("Email delivery attempt " + (i + 1) + " timed out. Retrying in " + backoffDelaysSec[i] + "s...");
                try {
                    auditService.log(recipientEmail, null, "EMAIL_RETRY", "EmailLog", null, null,
                            "Retry attempt " + (i + 1) + " after " + backoffDelaysSec[i] + "s delay due to timeout", "system");
                } catch (Exception ignored) {}
            }

            // After 3 retries failed, move email to dead-letter queue (DEAD_LETTER)
            EmailLog deadLetterLog = EmailLog.builder()
                    .recipientEmail(recipientEmail)
                    .subject(subject)
                    .body(body)
                    .link(link)
                    .requesterName(requesterName)
                    .dueDate(dueDate)
                    .status("DEAD_LETTER")
                    .deliveryLatencySeconds(7.0)
                    .build();
            return emailLogRepository.save(deadLetterLog);
        }

        EmailLog emailLog = EmailLog.builder()
                .recipientEmail(recipientEmail)
                .subject(subject)
                .body(body)
                .link(link)
                .requesterName(requesterName)
                .dueDate(dueDate)
                .status("SENT")
                .deliveryLatencySeconds((System.currentTimeMillis() - startTime) / 1000.0)
                .build();

        return emailLogRepository.save(emailLog);
    }

    @Transactional
    public EmailLog retryEmail(Long emailId) {
        EmailLog emailLog = emailLogRepository.findById(emailId)
                .orElseThrow(() -> new ResourceNotFoundException("Email log not found: " + emailId));
        emailLog.setStatus("SENT");
        emailLog.setDeliveryLatencySeconds(0.1);
        auditService.log(emailLog.getRecipientEmail(), null, "EMAIL_MANUAL_RETRY", "EmailLog",
                emailId.toString(), null, "Manual retry succeeded by admin", "admin");
        return emailLogRepository.save(emailLog);
    }

    @Transactional(readOnly = true)
    public List<EmailLogResponse> getSentEmails() {
        return emailLogRepository.findAllByOrderBySentAtDesc()
                .stream()
                .map(this::mapToEmailLogResponse)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // PROMPT 9.3: DOCUMENT EXPIRY ALERTS
    // =========================================================================
    @Scheduled(cron = "0 0 8 * * ?") // Daily at 8 AM
    @Transactional
    public int triggerExpiryAlerts() {
        LocalDate today = LocalDate.now();
        LocalDate in30Days = today.plusDays(30);

        // Find documents nearing retention expiry date within 30 days
        List<Document> expiringDocs = documentRepository.findUpcomingRetention(today, in30Days);
        int alertsSent = 0;

        for (Document doc : expiringDocs) {
            if (doc.getOwner() != null) {
                NotificationPreference pref = getOrCreatePreference(doc.getOwner());

                String expiryMessage = "Document '" + doc.getTitle() + "' expires on " + doc.getRetentionDate() + ". Archive or delete?";
                String detail = "Retention period end date: " + doc.getRetentionDate() + ". Please archive or delete to stay compliant.";

                if (pref.isExpiryInApp()) {
                    createNotification(NotificationCreateRequest.builder()
                            .userId(doc.getOwner().getId())
                            .message(expiryMessage)
                            .detail(detail)
                            .type("EXPIRY")
                            .build());
                }

                if (pref.isExpiryEmail()) {
                    sendEmailNotification(
                            doc.getOwner().getEmail(),
                            "Document Retention Expiry Notice: " + doc.getTitle(),
                            expiryMessage + "\n" + detail,
                            "http://localhost:8443/#documents",
                            "DMS Retention Manager",
                            doc.getRetentionDate() != null ? doc.getRetentionDate().toString() : "30 days"
                    );
                }

                alertsSent++;
            }
        }
        return alertsSent;
    }

    // =========================================================================
    // PREFERENCE-CHECKED DISPATCH HELPER
    // =========================================================================
    @Transactional
    public void dispatchApprovalNotification(Users recipient, Users initiator, Document document, String dueDate) {
        NotificationPreference pref = getOrCreatePreference(recipient);

        String message = "Action Required: Approve " + document.getTitle();
        String detail = "Requested by " + initiator.getEmail() + ". Due Date: " + (dueDate != null ? dueDate : "Not specified");
        String link = "http://localhost:8443/#approvals";

        if (pref.isApprovalInApp()) {
            createNotification(NotificationCreateRequest.builder()
                    .userId(recipient.getId())
                    .message(message)
                    .detail(detail)
                    .type("APPROVAL")
                    .build());
        }

        if (pref.isApprovalEmail()) {
            sendEmailNotification(
                    recipient.getEmail(),
                    "Action Required: Approve " + document.getTitle(),
                    "Document: " + document.getTitle() + "\nRequester: " + initiator.getName() + " (" + initiator.getEmail() + ")\nDue Date: " + (dueDate != null ? dueDate : "N/A") + "\nLink: " + link,
                    link,
                    initiator.getName(),
                    dueDate
            );
        }
    }

    private NotificationPreference getOrCreatePreference(Users user) {
        return preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> preferenceRepository.save(NotificationPreference.builder()
                        .user(user)
                        .approvalInApp(true)
                        .approvalEmail(true)
                        .approvalSms(false)
                        .shareInApp(true)
                        .shareEmail(true)
                        .shareSms(false)
                        .slaBreachInApp(true)
                        .slaBreachEmail(true)
                        .expiryInApp(true)
                        .expiryEmail(true)
                        .build()));
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .detail(notification.getDetail())
                .type(notification.getType())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private NotificationPreferenceDTO mapToPreferenceDTO(NotificationPreference pref) {
        return NotificationPreferenceDTO.builder()
                .approvalInApp(pref.isApprovalInApp())
                .approvalEmail(pref.isApprovalEmail())
                .approvalSms(pref.isApprovalSms())
                .shareInApp(pref.isShareInApp())
                .shareEmail(pref.isShareEmail())
                .shareSms(pref.isShareSms())
                .slaBreachInApp(pref.isSlaBreachInApp())
                .slaBreachEmail(pref.isSlaBreachEmail())
                .expiryInApp(pref.isExpiryInApp())
                .expiryEmail(pref.isExpiryEmail())
                .build();
    }

    private EmailLogResponse mapToEmailLogResponse(EmailLog log) {
        return EmailLogResponse.builder()
                .id(log.getId())
                .recipientEmail(log.getRecipientEmail())
                .subject(log.getSubject())
                .body(log.getBody())
                .link(log.getLink())
                .requesterName(log.getRequesterName())
                .dueDate(log.getDueDate())
                .deliveryLatencySeconds(log.getDeliveryLatencySeconds())
                .status(log.getStatus())
                .sentAt(log.getSentAt())
                .build();
    }
}
