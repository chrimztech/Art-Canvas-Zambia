package com.artcanvaszambia.backend.exhibitions.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ExhibitionDto(
        UUID id,
        String slug,
        String title,
        String description,
        String coverImageUrl,
        String venue,
        String city,
        Instant startsAt,
        Instant endsAt,
        BigDecimal ticketPriceZmw,
        Integer capacity,
        String status,
        UUID organizerId,
        String organizerDisplayName,
        String curatorName,
        String theme,
        List<String> tags,
        String contactEmail,
        String contactPhone,
        boolean isFeatured
) {
}
