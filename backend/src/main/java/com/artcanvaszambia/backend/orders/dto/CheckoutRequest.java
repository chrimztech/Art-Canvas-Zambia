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
        String country,
        // Delivery for physical goods: "delivery" (default) or "pickup" from the seller.
        String deliveryMethod,
        String shippingName,
        String shippingPhone,
        String shippingAddress,
        String shippingCity,
        String shippingNotes,
        // Mobile network for mobile-money payments (airtel | mtn | zamtel); inferred from the number when blank.
        String operator,
        // Optional discount code (seller or platform coupon).
        String couponCode,
        // Optional gift card to spend against this order.
        String giftCardCode
) {
}
