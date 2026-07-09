package com.artcanvaszambia.backend.commissions.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CommissionDto(
        UUID id,
        UUID customerId,
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
