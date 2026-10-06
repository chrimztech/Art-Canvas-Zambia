package com.artcanvaszambia.backend.reviews.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ReviewDtos {
    private ReviewDtos() {
    }

    public record ReviewRequest(
            @NotNull UUID orderItemId,
            @Min(1) @Max(5) int rating,
            @Size(max = 2000) String comment
    ) {
    }

    public record ReplyRequest(@NotBlank @Size(max = 2000) String reply) {
    }

    public record ReviewDto(
            UUID id,
            int rating,
            String comment,
            String reviewerName,
            UUID sellerId,
            String itemTitle,
            String itemType,
            UUID referenceId,
            Instant createdAt,
            String sellerReply,
            Instant sellerRepliedAt
    ) {
    }

    /** Average rating, count and a 1–5 star histogram (index 0 = one star) plus the latest reviews. */
    public record ReviewSummaryDto(double average, long count, long[] histogram, List<ReviewDto> reviews) {
    }

    /** Compact rating used on cards and profiles. */
    public record RatingDto(double average, long count) {
    }
}
