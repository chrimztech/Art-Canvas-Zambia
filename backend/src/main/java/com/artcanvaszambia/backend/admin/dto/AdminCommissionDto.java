package com.artcanvaszambia.backend.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AdminCommissionDto(
        UUID id,
        UUID customerId,
        String customerDisplayName,
        UUID artistId,
        String artistDisplayName,
        String title,
        String brief,
        BigDecimal budgetZmw,
        BigDecimal quotedPriceZmw,
        LocalDate deadline,
        String status,
        Instant createdAt
) {
}
