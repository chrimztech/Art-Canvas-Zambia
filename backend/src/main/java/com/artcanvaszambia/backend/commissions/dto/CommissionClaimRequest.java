package com.artcanvaszambia.backend.commissions.dto;

import java.math.BigDecimal;

public record CommissionClaimRequest(BigDecimal quotedPriceZmw) {
}
