package com.artcanvaszambia.backend.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AdminSupplyDto(
        UUID id,
        String slug,
        String name,
        BigDecimal priceZmw,
        String coverImageUrl,
        String category,
        String condition,
        int stock,
        String status,
        UUID sellerId,
        String sellerDisplayName,
        Instant createdAt
) {
}
