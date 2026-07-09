package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderDetailDto(
        UUID id,
        String orderNumber,
        String status,
        BigDecimal subtotalZmw,
        BigDecimal platformFeeZmw,
        BigDecimal royaltyZmw,
        BigDecimal totalZmw,
        String paymentProvider,
        String paymentReference,
        Instant createdAt,
        List<OrderItemDto> items
) {
}
