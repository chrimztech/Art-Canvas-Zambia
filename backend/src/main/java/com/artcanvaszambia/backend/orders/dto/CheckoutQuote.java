package com.artcanvaszambia.backend.orders.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Price breakdown for the cart before paying: discounts, delivery and gift-card credit applied. */
public record CheckoutQuote(
        List<Line> lines,
        BigDecimal subtotalZmw,
        BigDecimal discountZmw,
        BigDecimal shippingZmw,
        BigDecimal giftCardZmw,
        BigDecimal totalZmw,
        String couponCode,
        // Why a supplied coupon wasn't applied (null when applied or none given).
        String couponMessage,
        String giftCardCode,
        BigDecimal giftCardBalanceZmw,
        String giftCardMessage
) {
    public record Line(String itemType, UUID referenceId, String title, int quantity, BigDecimal lineTotalZmw,
                       BigDecimal discountZmw, BigDecimal shippingZmw) {
    }
}
