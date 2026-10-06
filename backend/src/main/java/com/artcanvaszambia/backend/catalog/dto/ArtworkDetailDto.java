package com.artcanvaszambia.backend.catalog.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ArtworkDetailDto(
        UUID id,
        String slug,
        String title,
        String description,
        String medium,
        String dimensions,
        Integer yearCreated,
        BigDecimal priceZmw,
        boolean isOriginal,
        Integer editionSize,
        String status,
        String coverImageUrl,
        int viewCount,
        UUID categoryId,
        UUID artistId,
        String artistDisplayName,
        String artistBio,
        String artistAvatarUrl,
        List<String> images,
        Instant createdAt,
        String materials,
        String style,
        List<String> tags,
        BigDecimal weightKg,
        boolean framed,
        String provenance,
        boolean signed,
        String signatureLocation,
        boolean certificateOfAuthenticity,
        String surface,
        String orientation,
        String shippingNotes,
        boolean readyToHang,
        String originCity,
        String originCountry,
        String categoryName,
        String artistLocation,
        boolean artistVerified
) {
}
