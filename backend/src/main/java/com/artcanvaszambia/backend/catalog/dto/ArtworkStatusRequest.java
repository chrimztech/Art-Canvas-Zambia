package com.artcanvaszambia.backend.catalog.dto;

import jakarta.validation.constraints.NotBlank;

public record ArtworkStatusRequest(@NotBlank String status) {
}
