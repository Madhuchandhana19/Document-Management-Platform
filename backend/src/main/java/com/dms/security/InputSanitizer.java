package com.dms.security;

import java.util.regex.Pattern;

public class InputSanitizer {

    private static final Pattern SCRIPT_PATTERN = Pattern.compile("<script.*?>.*?</script>|<.*?script.*?>", Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_PATTERN = Pattern.compile("<[^>]*>");
    private static final Pattern SQL_PATTERN = Pattern.compile("('.*?(UNION|SELECT|DROP|INSERT|DELETE|UPDATE|CREATE|ALTER|TRUNCATE)\\s+)", Pattern.CASE_INSENSITIVE);

    public static String sanitize(String input) {
        if (input == null) {
            return null;
        }
        String sanitized = SCRIPT_PATTERN.matcher(input).replaceAll("");
        sanitized = HTML_PATTERN.matcher(sanitized).replaceAll("");
        return sanitized;
    }

    public static boolean isSafe(String input) {
        if (input == null || input.trim().isEmpty()) {
            return true;
        }
        if (SCRIPT_PATTERN.matcher(input).find()) {
            return false;
        }
        if (HTML_PATTERN.matcher(input).find()) {
            return false;
        }
        if (SQL_PATTERN.matcher(input).find()) {
            return false;
        }
        // Obvious SQL injection strings directly
        String upper = input.toUpperCase();
        if (upper.contains("UNION SELECT") || upper.contains("DROP TABLE") || upper.contains("DROP DATABASE")) {
            return false;
        }
        return true;
    }
}
