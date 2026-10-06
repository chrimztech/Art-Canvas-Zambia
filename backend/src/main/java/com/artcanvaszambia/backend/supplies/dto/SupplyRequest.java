package com.artcanvaszambia.backend.supplies.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

public record SupplyRequest(
        @NotBlank String name,
        String description,
        String category,
        String condition,
        @NotNull @PositiveOrZero BigDecimal priceZmw,
        @PositiveOrZero Integer stock,
        @NotBlank(message = "A cover image is required") String coverImageUrl,
        String brand,
        String sku,
        String dimensions,
        BigDecimal weightKg,
        Integer warrantyMonths,
        List<String> tags,
        // Optional gallery images (cover excluded); when non-null they replace the existing gallery.
        List<String> imageUrls,
        // Optional "draft" or "published" (defaults to published on create).
        String status
) {
}
