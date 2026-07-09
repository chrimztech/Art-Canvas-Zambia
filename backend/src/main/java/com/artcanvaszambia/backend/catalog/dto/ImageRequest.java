package com.artcanvaszambia.backend.catalog.dto;

import jakarta.validation.constraints.NotBlank;

public record ImageRequest(@NotBlank String imageUrl) {
}
