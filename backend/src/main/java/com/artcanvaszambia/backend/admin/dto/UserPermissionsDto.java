package com.artcanvaszambia.backend.admin.dto;

import java.util.List;
import java.util.UUID;

public record UserPermissionsDto(UUID userId, List<String> effective, List<PermissionOverrideDto> overrides) {
}
