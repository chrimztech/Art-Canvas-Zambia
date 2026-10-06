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
        String coverImageUrl,
        // False once the item has sold, been unpublished or run out of stock; checkout will refuse it.
        boolean available,
        // Upper bound for the quantity selector (1 for original artworks, remaining stock for supplies).
        int maxQuantity
) {
}
