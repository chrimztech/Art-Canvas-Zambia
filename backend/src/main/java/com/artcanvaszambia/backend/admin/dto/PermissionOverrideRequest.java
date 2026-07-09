package com.artcanvaszambia.backend.admin.dto;

import jakarta.validation.constraints.NotNull;

public record PermissionOverrideRequest(@NotNull Boolean granted) {
}
