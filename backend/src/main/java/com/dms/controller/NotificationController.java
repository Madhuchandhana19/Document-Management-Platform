package com.dms.controller;

import com.dms.dto.ErrorResponse;
import com.dms.dto.NotificationDTO.*;
import com.dms.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification Management", description = "Endpoints for managing user notifications and preferences")
@SecurityRequirement(name = "BearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get all notifications for current user", description = "Returns chronological list of notifications for authenticated user.")
    @ApiResponse(responseCode = "200", description = "Notifications retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<NotificationResponse>> getUserNotifications(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notificationService.getUserNotifications(userDetails.getUsername()));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread notification count", description = "Returns total count of unread notifications.")
    @ApiResponse(responseCode = "200", description = "Unread count retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Long> getUnreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notificationService.getUnreadCount(userDetails.getUsername()));
    }

    @PutMapping("/mark-all-read")
    @Operation(summary = "Mark all notifications as read", description = "Marks all unread notifications as read for current user.")
    @ApiResponse(responseCode = "200", description = "All notifications marked as read")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllAsRead(userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark a specific notification as read", description = "Marks notification ID as read.")
    @ApiResponse(responseCode = "200", description = "Notification marked as read")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Notification not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> markAsRead(@Parameter(description = "Notification ID") @PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAsRead(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Dismiss/delete a notification", description = "Deletes notification ID for current user.")
    @ApiResponse(responseCode = "200", description = "Notification dismissed successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Notification not found", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> dismissNotification(@Parameter(description = "Notification ID") @PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.dismissNotification(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/preferences")
    @Operation(summary = "Get notification preferences for current user", description = "Returns channel configuration preferences for in-app, email, and SMS.")
    @ApiResponse(responseCode = "200", description = "Preferences retrieved successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = NotificationPreferenceDTO.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<NotificationPreferenceDTO> getUserPreferences(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notificationService.getUserPreferences(userDetails.getUsername()));
    }

    @PutMapping("/preferences")
    @Operation(summary = "Update notification preferences for current user", description = "Updates channel preferences for notifications.")
    @ApiResponse(responseCode = "200", description = "Preferences updated successfully", content = @Content(mediaType = "application/json", schema = @Schema(implementation = NotificationPreferenceDTO.class)))
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<NotificationPreferenceDTO> updateUserPreferences(
            @RequestBody NotificationPreferenceDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notificationService.updateUserPreferences(userDetails.getUsername(), request));
    }

    @GetMapping("/emails")
    @Operation(summary = "Get sent email notification logs", description = "Returns log of email dispatches.")
    @ApiResponse(responseCode = "200", description = "Sent emails retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<EmailLogResponse>> getSentEmails() {
        return ResponseEntity.ok(notificationService.getSentEmails());
    }

    @PostMapping("/trigger-expiry-alerts")
    @Operation(summary = "Trigger immediate retention/expiry notifications scan", description = "Scans for expiring documents and sends alerts.")
    @ApiResponse(responseCode = "200", description = "Expiry scanner completed successfully")
    @ApiResponse(responseCode = "401", description = "Unauthorized token", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Integer> triggerExpiryAlerts() {
        int count = notificationService.triggerExpiryAlerts();
        return ResponseEntity.ok(count);
    }

    @PostMapping("/emails/{id}/retry")
    @Operation(summary = "Manually retry sending a failed email", description = "Retries sending a dead-letter queued or failed email.")
    @ApiResponse(responseCode = "200", description = "Email manual retry initiated")
    public ResponseEntity<com.dms.entity.EmailLog> retryEmail(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.retryEmail(id));
    }
}
