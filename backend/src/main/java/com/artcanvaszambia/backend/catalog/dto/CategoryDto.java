package com.artcanvaszambia.backend.catalog.dto;

import com.artcanvaszambia.backend.catalog.Category;

import java.util.UUID;

public record CategoryDto(UUID id, String slug, String name, String description, int sortOrder) {
    public static CategoryDto from(Category c) {
        return new CategoryDto(c.getId(), c.getSlug(), c.getName(), c.getDescription(), c.getSortOrder());
    }
}
