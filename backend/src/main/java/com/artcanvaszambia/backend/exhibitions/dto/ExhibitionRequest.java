package com.artcanvaszambia.backend.exhibitions.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ExhibitionRequest(
        @NotBlank String title,
        String description,
        @NotBlank(message = "A cover image is required") String coverImageUrl,
        @NotBlank String venue,
        String city,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt,
        BigDecimal ticketPriceZmw,
        Integer capacity,
        String curatorName,
        String theme,
        List<String> tags,
        String contactEmail,
        String contactPhone,
        Boolean isFeatured
) {
}
