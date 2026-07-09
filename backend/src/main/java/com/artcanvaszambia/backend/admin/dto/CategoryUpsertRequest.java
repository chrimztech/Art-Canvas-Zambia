package com.artcanvaszambia.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoryUpsertRequest(
        @NotBlank String name,
        String slug,
        String description,
        @NotNull Integer sortOrder
) {
}
