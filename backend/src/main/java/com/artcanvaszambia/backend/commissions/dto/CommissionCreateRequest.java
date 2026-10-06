package com.artcanvaszambia.backend.commissions.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CommissionCreateRequest(
        @NotBlank String title,
        @NotBlank String brief,
        BigDecimal budgetZmw,
        LocalDate deadline,
        // Optional: send the brief straight to one artist instead of the open pool.
        UUID artistId,
        List<String> referenceImageUrls
) {
}
