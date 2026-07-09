package com.artcanvaszambia.backend.payouts.dto;

import java.math.BigDecimal;

public record AvailableBalanceDto(
        BigDecimal totalEarned,
        BigDecimal alreadyPaidOut,
        BigDecimal availableBalance
) {
}
