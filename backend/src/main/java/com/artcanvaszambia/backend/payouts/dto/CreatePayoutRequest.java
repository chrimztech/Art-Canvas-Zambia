package com.artcanvaszambia.backend.payouts.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreatePayoutRequest(
        @NotNull @Positive BigDecimal amountZmw,
        String method,
        String phone,
        String bankName,
        String receiverId
) {
}
