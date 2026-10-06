package com.artcanvaszambia.backend.supplies.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SupplyDetailDto(
        UUID id,
        String slug,
        String name,
        String description,
        String category,
        String condition,
        BigDecimal priceZmw,
        int stock,
        String coverImageUrl,
        String status,
        UUID sellerId,
        String sellerDisplayName,
        String sellerLocation,
        String sellerPhone,
        String brand,
        String sku,
        String dimensions,
        BigDecimal weightKg,
        Integer warrantyMonths,
        List<String> tags,
        List<String> images,
        BigDecimal shippingFeeZmw,
        boolean sellerOnVacation,
        String sellerVacationMessage
) {
}
