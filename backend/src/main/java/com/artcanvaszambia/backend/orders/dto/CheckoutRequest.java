package com.artcanvaszambia.backend.orders.dto;

import jakarta.validation.constraints.NotBlank;

public record CheckoutRequest(
        @NotBlank String paymentMethod,
        String phone,
        String firstName,
        String lastName,
        String address,
        String city,
        String state,
        String zipCode,
        String country
) {
}
