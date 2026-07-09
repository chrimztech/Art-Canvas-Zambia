package com.artcanvaszambia.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record RoleRequest(@NotBlank String role) {
}
