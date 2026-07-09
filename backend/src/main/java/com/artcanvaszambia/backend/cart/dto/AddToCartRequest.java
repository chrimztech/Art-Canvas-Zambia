package com.artcanvaszambia.backend.cart.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record AddToCartRequest(@NotNull UUID artworkId, @Positive int quantity, String itemType) {
    public UUID itemId() {
        return artworkId;
    }
}
