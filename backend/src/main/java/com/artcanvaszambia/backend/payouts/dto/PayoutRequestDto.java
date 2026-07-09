package com.artcanvaszambia.backend.payouts.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PayoutRequestDto(
        UUID id,
        UUID artistId,
        String artistDisplayName,
        String payeeType,
        BigDecimal amountZmw,
        String method,
        String phone,
        String bankName,
        String receiverId,
        String referenceNo,
        String status,
        String adminNote,
        Instant createdAt
) {
}
