package com.artcanvaszambia.backend.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AdminOrderDto(
        UUID id,
        String orderNumber,
        String status,
        BigDecimal totalZmw,
        String paymentProvider,
        String paymentReference,
        Instant createdAt,
        UUID buyerId,
        String buyerDisplayName,
        String buyerEmail
) {
}
