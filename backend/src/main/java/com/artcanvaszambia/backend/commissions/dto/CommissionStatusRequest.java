package com.artcanvaszambia.backend.commissions.dto;

import jakarta.validation.constraints.NotBlank;

public record CommissionStatusRequest(@NotBlank String status) {
}
