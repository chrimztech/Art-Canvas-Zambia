package com.artcanvaszambia.backend.supplies.dto;

import jakarta.validation.constraints.NotBlank;

public record SupplyImageRequest(@NotBlank String imageUrl) {
}
