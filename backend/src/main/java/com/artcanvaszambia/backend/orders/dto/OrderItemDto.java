package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
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
        BigDecimal artistPayoutZmw
) {
}
