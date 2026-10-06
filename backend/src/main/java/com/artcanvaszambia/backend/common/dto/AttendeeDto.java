package com.artcanvaszambia.backend.common.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** One student on a class roster or one ticket on an exhibition guest list, as seen by the host. */
public record AttendeeDto(
        UUID id,
        UUID userId,
        String displayName,
        String email,
        String status,
        int quantity,
        BigDecimal amountZmw,
        Instant createdAt,
        Instant checkedInAt
) {
}
