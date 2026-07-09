package com.artcanvaszambia.backend.security.dto;

import java.time.Instant;
import java.util.UUID;

public record SessionDto(
        UUID id,
        UUID userId,
        String userDisplayName,
        String userEmail,
        String ipAddress,
        String userAgent,
        Instant createdAt,
        Instant lastSeenAt,
        Instant expiresAt,
        boolean current,
        boolean active
) {
}
