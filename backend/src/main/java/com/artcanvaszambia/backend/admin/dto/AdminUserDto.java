package com.artcanvaszambia.backend.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminUserDto(
        UUID id,
        String displayName,
        String email,
        Instant createdAt,
        List<String> roles,
        boolean verified,
        Instant verificationRequestedAt
) {
}
