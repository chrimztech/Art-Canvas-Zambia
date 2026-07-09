package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SaleDto(
        UUID id,
        String title,
        int quantity,
        BigDecimal lineTotalZmw,
        BigDecimal platformFeeZmw,
        BigDecimal royaltyZmw,
        BigDecimal artistPayoutZmw,
        Instant createdAt,
        String orderNumber,
        String orderStatus
) {
}
