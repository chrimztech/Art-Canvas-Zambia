package com.artcanvaszambia.backend.catalog.dto;

import java.util.List;
import java.util.UUID;

public record ArtistDetailDto(
        UUID id,
        String displayName,
        String avatarUrl,
        String bio,
        String location,
        String website,
        String instagram,
        List<ArtworkSummaryDto> artworks,
        String coverImageUrl,
        String facebookUrl,
        String twitterUrl,
        String tiktokUrl,
        List<String> specialties,
        Integer yearsExperience,
        boolean verified,
        double averageRating,
        long reviewCount
) {
}
