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
}
