package com.dms.audit;

import com.dms.entity.AuditLog;
import com.dms.entity.Document;
import com.dms.entity.Users;
import com.dms.repository.AuditLogRepository;
import com.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public void log(String username, Document document, String action, String entityType,
            String entityId, String oldValue, String newValue, String ipAddress) {

        Users user = null;
        if (username != null) {
            user = userRepository.findByEmail(username).orElse(null);
        }

        AuditLog auditLog = AuditLog.builder()
                .user(user)
                .document(document)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValue(oldValue)
                .newValue(newValue)
                .ipAddress(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
    }
}
