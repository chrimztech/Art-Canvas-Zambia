package com.artcanvaszambia.backend.commissions.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CommissionCreateRequest(
        @NotBlank String title,
        @NotBlank String brief,
        BigDecimal budgetZmw,
        LocalDate deadline
) {
}
