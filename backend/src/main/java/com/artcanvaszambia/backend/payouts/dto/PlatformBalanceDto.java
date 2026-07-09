package com.artcanvaszambia.backend.payouts.dto;

import java.math.BigDecimal;

public record PlatformBalanceDto(String payeeType, BigDecimal totalEarned, BigDecimal alreadyPaidOut, BigDecimal availableBalance) {
}
