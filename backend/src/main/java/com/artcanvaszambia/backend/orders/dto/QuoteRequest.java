package com.artcanvaszambia.backend.orders.dto;

/** Inputs that change the cart total: delivery choice and optional codes. */
public record QuoteRequest(String deliveryMethod, String couponCode, String giftCardCode) {
}
