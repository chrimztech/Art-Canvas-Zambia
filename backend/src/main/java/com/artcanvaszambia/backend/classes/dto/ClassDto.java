package com.artcanvaszambia.backend.classes.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ClassDto(
        UUID id,
        String slug,
        String title,
        String description,
        String coverImageUrl,
        String mode,
        String location,
        String meetingUrl,
        Instant startsAt,
        Instant endsAt,
        int capacity,
        BigDecimal priceZmw,
        String status,
        UUID instructorId,
        String instructorDisplayName,
        String skillLevel,
        String prerequisites,
        String syllabus,
        List<String> tags,
        boolean materialsIncluded
) {
}
