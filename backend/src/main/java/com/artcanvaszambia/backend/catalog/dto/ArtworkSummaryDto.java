package com.artcanvaszambia.backend.catalog.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ArtworkSummaryDto(
        UUID id,
        String slug,
        String title,
        BigDecimal priceZmw,
        String coverImageUrl,
        String medium,
        UUID artistId,
        String artistDisplayName,
        String status,
        int viewCount,
        Instant createdAt
) {
}
