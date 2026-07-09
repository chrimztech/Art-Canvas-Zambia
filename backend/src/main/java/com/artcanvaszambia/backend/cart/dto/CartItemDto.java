package com.artcanvaszambia.backend.cart.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemDto(
        UUID id,
        int quantity,
        String itemType,
        UUID itemId,
        UUID artworkId,
        String title,
        String slug,
        BigDecimal priceZmw,
        String coverImageUrl
) {
}
