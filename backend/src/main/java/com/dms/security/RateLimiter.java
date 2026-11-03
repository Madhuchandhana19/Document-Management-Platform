package com.dms.security;

import org.springframework.stereotype.Component;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
public class RateLimiter {

    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<Long>> requestHistory = new ConcurrentHashMap<>();

    public boolean isAllowed(String key, int maxRequests, long windowMillis) {
        long now = System.currentTimeMillis();
        long threshold = now - windowMillis;

        ConcurrentLinkedQueue<Long> queue = requestHistory.computeIfAbsent(key, k -> new ConcurrentLinkedQueue<>());

        while (!queue.isEmpty()) {
            Long head = queue.peek();
            if (head != null && head < threshold) {
                queue.poll();
            } else {
                break;
            }
        }

        if (queue.size() >= maxRequests) {
            return false;
        }

        queue.add(now);
        return true;
    }
}
