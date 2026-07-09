package com.artcanvaszambia.backend.admin.dto;

import java.math.BigDecimal;

public record PlatformSettingsUpdateRequest(
        BigDecimal platformFeePercent,
        BigDecimal developerRoyaltyPercent,
        String currency,
        String paymentProvider,
        String heroImageUrl,
        String developerPayoutMethod,
        String developerPayoutPhone,
        String developerPayoutBankName,
        String developerPayoutReceiverId,
        String ownerPayoutMethod,
        String ownerPayoutPhone,
        String ownerPayoutBankName,
        String ownerPayoutReceiverId
) {
}
