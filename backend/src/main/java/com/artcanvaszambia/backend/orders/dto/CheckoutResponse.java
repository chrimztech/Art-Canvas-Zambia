package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CheckoutResponse(
        UUID orderId,
        String orderNumber,
        BigDecimal total,
        String paymentMethod,
        String redirectUrl,
        String message
) {
}
