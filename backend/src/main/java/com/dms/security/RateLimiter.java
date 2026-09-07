package com.dms.security;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimiter {

    // Maps key ("ip:endpoint") to a list of request timestamps (in epoch millis)
    // NOTE: This implementation is in-memory and simple. It is suitable for a single-instance demo.
    // In a distributed production system, a shared store like Redis (using token bucket or sliding window)
    // would be used to prevent state loss on restarts and ensure correctness across multiple nodes.
    private final ConcurrentHashMap<String, List<Long>> requestHistory = new ConcurrentHashMap<>();

    public boolean isAllowed(String key, int maxRequests, long windowMillis) {
        long now = System.currentTimeMillis();
        long threshold = now - windowMillis;

        List<Long> timestamps = requestHistory.computeIfAbsent(key, k -> new ArrayList<>());

        synchronized (timestamps) {
            // Prune timestamps older than window limit
            timestamps.removeIf(time -> time < threshold);

            if (timestamps.size() >= maxRequests) {
                return false;
            }

            timestamps.add(now);
            return true;
        }
    }
}
