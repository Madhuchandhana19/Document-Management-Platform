package com.dms.repository;

import com.dms.entity.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    List<EmailLog> findByRecipientEmailOrderBySentAtDesc(String recipientEmail);
    List<EmailLog> findAllByOrderBySentAtDesc();
}
