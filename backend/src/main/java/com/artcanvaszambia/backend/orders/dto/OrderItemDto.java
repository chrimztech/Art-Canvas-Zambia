package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderItemDto(
        UUID id,
        UUID artworkId,
        String itemType,
        UUID referenceId,
        String title,
        BigDecimal unitPriceZmw,
        int quantity,
        BigDecimal lineTotalZmw,
        BigDecimal platformFeeZmw,
        BigDecimal royaltyZmw,
        BigDecimal artistPayoutZmw,
        UUID sellerId,
        String sellerDisplayName,
        String fulfillmentStatus,
        String carrier,
        String trackingNumber,
        Instant shippedAt,
        Instant deliveredAt,
        boolean physical,
        // The buyer's own review rating (null if not reviewed yet).
        Integer myRating,
        // Latest refund request status for this item (requested | refunded | rejected), or null.
        String refundStatus,
        boolean refunded,
        BigDecimal discountZmw,
        BigDecimal shippingZmw
) {
}
