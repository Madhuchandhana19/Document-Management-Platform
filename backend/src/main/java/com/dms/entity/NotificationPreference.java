package com.dms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_preference")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Users user;

    @Column(nullable = false)
    @Builder.Default
    private boolean approvalInApp = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean approvalEmail = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean approvalSms = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean shareInApp = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean shareEmail = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean shareSms = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean slaBreachInApp = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean slaBreachEmail = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean expiryInApp = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean expiryEmail = true;
}
