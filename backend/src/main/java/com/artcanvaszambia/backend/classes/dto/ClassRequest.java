package com.artcanvaszambia.backend.classes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ClassRequest(
        @NotBlank String title,
        String description,
        @NotBlank(message = "A cover image is required") String coverImageUrl,
        String mode,
        String location,
        String meetingUrl,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt,
        Integer capacity,
        BigDecimal priceZmw,
        String skillLevel,
        String prerequisites,
        String syllabus,
        List<String> tags,
        Boolean materialsIncluded
) {
}
