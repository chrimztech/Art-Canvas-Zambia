package com.artcanvaszambia.backend.catalog.dto;

import java.util.UUID;

public record ArtistSummaryDto(
        UUID id,
        String displayName,
        String avatarUrl,
        String bio,
        String location,
        long artworkCount
) {
}
