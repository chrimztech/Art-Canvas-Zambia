package com.artcanvaszambia.backend.exhibitions.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TicketDto(
        UUID id,
        UUID exhibitionId,
        String exhibitionTitle,
        String exhibitionSlug,
        String exhibitionCoverImageUrl,
        Instant startsAt,
        Instant endsAt,
        int quantity,
        BigDecimal totalZmw,
        String status,
        Instant createdAt,
        String qrCode,
        Instant checkedInAt
) {
}
