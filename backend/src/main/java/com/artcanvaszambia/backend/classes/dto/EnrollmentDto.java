package com.artcanvaszambia.backend.classes.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record EnrollmentDto(
        UUID id,
        UUID classId,
        String classTitle,
        String classSlug,
        String classCoverImageUrl,
        Instant startsAt,
        Instant endsAt,
        String status,
        BigDecimal amountPaidZmw,
        Instant createdAt,
        String mode,
        String location,
        // Only revealed to confirmed students.
        String meetingUrl,
        String instructorDisplayName
) {
}
