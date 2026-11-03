package com.dms.controller;

import com.dms.exception.AuthServiceUnavailableException;
import com.dms.exception.DatabaseUnavailableException;
import com.dms.exception.DeadlockException;
import com.dms.service.AnalyticsService;
import com.dms.service.AuthService;
import com.dms.service.DocumentService;
import com.dms.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/test/fault")
@Tag(name = "Fault Simulation & Resiliency Testing", description = "Endpoints for simulating system faults, network packet loss, DB connection failure, email timeouts, disk full, and deadlocks")
public class FaultSimulationController {

    private static boolean dbSimulated = false;

    public static boolean isDbSimulated() {
        return dbSimulated;
    }

    @PostMapping("/db-simulate")
    @Operation(summary = "Toggle database connection loss simulation")
    public ResponseEntity<Map<String, Object>> toggleDbSimulate(@RequestParam boolean active) {
        dbSimulated = active;
        return ResponseEntity.ok(Map.of("dbSimulated", dbSimulated, "message", active ? "Database connection loss simulated" : "Database connection restored"));
    }

    @GetMapping("/db-query")
    @Operation(summary = "Simulate a database query under connection status")
    public ResponseEntity<Map<String, String>> dbQuery() {
        if (dbSimulated) {
            throw new DatabaseUnavailableException("Database temporarily unavailable. Please try again.");
        }
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Database query executed successfully"));
    }

    @PostMapping("/email-timeout")
    @Operation(summary = "Toggle external email service timeout simulation")
    public ResponseEntity<Map<String, Object>> toggleEmailTimeout(@RequestParam boolean active) {
        NotificationService.setEmailServiceTimeout(active);
        return ResponseEntity.ok(Map.of("emailTimeoutSimulated", active));
    }

    @PostMapping("/disk-full")
    @Operation(summary = "Toggle disk full / storage quota simulation")
    public ResponseEntity<Map<String, Object>> toggleDiskFull(@RequestParam boolean active) {
        DocumentService.setDiskFull(active);
        return ResponseEntity.ok(Map.of("diskFullSimulated", active));
    }

    @PostMapping("/memory-alert")
    @Operation(summary = "Set simulated memory usage percentage for monitoring alerts")
    public ResponseEntity<Map<String, Object>> setMemoryPercentage(@RequestParam double percentage) {
        AnalyticsService.setSimulatedMemoryPercentage(percentage);
        return ResponseEntity.ok(Map.of("simulatedMemoryPercentage", percentage));
    }

    @PostMapping("/auth-service")
    @Operation(summary = "Toggle authentication service availability")
    public ResponseEntity<Map<String, Object>> toggleAuthService(@RequestParam boolean active) {
        AuthService.setAuthServiceAvailable(active);
        return ResponseEntity.ok(Map.of("authServiceAvailable", active));
    }

    @PostMapping("/deadlock")
    @Operation(summary = "Simulate a database deadlock scenario")
    public ResponseEntity<Map<String, String>> triggerDeadlock() {
        throw new DeadlockException("Database deadlock detected");
    }
}
