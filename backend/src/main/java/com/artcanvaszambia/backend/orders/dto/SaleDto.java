package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
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
        String orderStatus,
        UUID orderId,
        String itemType,
        String fulfillmentStatus,
        String carrier,
        String trackingNumber,
        String buyerDisplayName,
        String buyerEmail,
        Map<String, String> shippingAddress,
        boolean refunded,
        UUID buyerId
) {
}
