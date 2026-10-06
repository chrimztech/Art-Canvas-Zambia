package com.artcanvaszambia.backend.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ArtworkRequest(
        @NotBlank String title,
        String description,
        String medium,
        String dimensions,
        Integer yearCreated,
        @NotNull @PositiveOrZero BigDecimal priceZmw,
        Boolean isOriginal,
        Integer editionSize,
        UUID categoryId,
        @NotBlank(message = "A cover image is required") String coverImageUrl,
        String materials,
        String style,
        List<String> tags,
        BigDecimal weightKg,
        Boolean framed,
        String provenance,
        Boolean signed,
        String signatureLocation,
        Boolean certificateOfAuthenticity,
        String surface,
        String orientation,
        String shippingNotes,
        Boolean readyToHang,
        String originCity,
        String originCountry,
        // Optional gallery images (cover excluded); when non-null they replace the existing gallery.
        List<String> imageUrls,
        // Optional initial/updated listing status: "draft" or "published" (defaults to published on create).
        String status
) {
}
