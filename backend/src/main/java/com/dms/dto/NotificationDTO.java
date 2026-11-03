package com.dms.dto;

import lombok.*;

import java.time.LocalDateTime;

public class NotificationDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NotificationResponse {
        private Long id;
        private String message;
        private String detail;
        private String type;
        private boolean isRead;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NotificationCreateRequest {
        private Long userId;
        private String message;
        private String detail;
        private String type;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NotificationPreferenceDTO {
        private boolean approvalInApp;
        private boolean approvalEmail;
        private boolean approvalSms;
        private boolean shareInApp;
        private boolean shareEmail;
        private boolean shareSms;
        private boolean slaBreachInApp;
        private boolean slaBreachEmail;
        private boolean expiryInApp;
        private boolean expiryEmail;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EmailLogResponse {
        private Long id;
        private String recipientEmail;
        private String subject;
        private String body;
        private String link;
        private String requesterName;
        private String dueDate;
        private Double deliveryLatencySeconds;
        private String status;
        private LocalDateTime sentAt;
    }
}
