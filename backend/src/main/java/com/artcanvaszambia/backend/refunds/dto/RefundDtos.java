package com.artcanvaszambia.backend.refunds.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class RefundDtos {
    private RefundDtos() {
    }

    public record CreateRefundRequest(@NotNull UUID orderItemId, @NotBlank @Size(max = 2000) String reason) {
    }

    public record SellerResponseRequest(@NotBlank @Size(max = 2000) String response) {
    }

    /** decision: "refunded" (money returned to the buyer) or "rejected". */
    public record ResolveRefundRequest(@NotBlank String decision, @Size(max = 2000) String note) {
    }

    public record RefundDto(
            UUID id,
            UUID orderId,
            String orderNumber,
            UUID orderItemId,
            String itemTitle,
            String itemType,
            BigDecimal amountZmw,
            String reason,
            String status,
            String sellerResponse,
            String adminNote,
            UUID buyerId,
            String buyerDisplayName,
            String buyerEmail,
            UUID sellerId,
            String sellerDisplayName,
            String paymentProvider,
            String paymentReference,
            // Buyer's mobile number from checkout, so an admin can send the money back.
            String buyerPhone,
            Instant createdAt,
            Instant resolvedAt
    ) {
    }
}
