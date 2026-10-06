package com.artcanvaszambia.backend.commissions.dto;

import java.math.BigDecimal;

/** An artist's quote: used both to claim an open brief and to answer a direct request. */
public record CommissionClaimRequest(BigDecimal quotedPriceZmw, String note) {
}
