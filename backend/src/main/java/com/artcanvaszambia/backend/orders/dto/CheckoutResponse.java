package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

public record CheckoutResponse(
        UUID orderId,
        String orderNumber,
        BigDecimal total,
        String paymentMethod,
        String redirectUrl,
        String message,
        // Present when the payment must be completed in the gateway's browser widget (Lenco card payments).
        Map<String, Object> widget
) {
}
