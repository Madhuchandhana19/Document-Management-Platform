package com.dms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String recipientEmail;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column
    private String link;

    @Column
    private String requesterName;

    @Column
    private String dueDate;

    @Column
    private Double deliveryLatencySeconds;

    @Column(nullable = false)
    private String status; // "SENT" or "SKIPPED"

    @Column(nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime sentAt;
}
