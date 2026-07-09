package com.artcanvaszambia.backend.audit.dto;

import java.time.Instant;
import java.util.UUID;

public record AuditLogDto(
        UUID id,
        UUID actorId,
        String actorLabel,
        String action,
        String targetType,
        UUID targetId,
        String targetLabel,
        String details,
        Instant createdAt
) {
}
