package com.artcanvaszambia.backend.supplies.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SupplySummaryDto(
        UUID id,
        String slug,
        String name,
        BigDecimal priceZmw,
        String coverImageUrl,
        String category,
        String condition,
        int stock,
        String status,
        String brand
) {
}
