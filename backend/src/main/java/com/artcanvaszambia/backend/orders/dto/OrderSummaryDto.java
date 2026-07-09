package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderSummaryDto(
        UUID id,
        String orderNumber,
        String status,
        BigDecimal totalZmw,
        String paymentProvider,
        Instant createdAt
) {
}
