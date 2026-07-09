package com.artcanvaszambia.backend.auth.dto;

import java.util.List;
import java.util.UUID;

public record AuthResponse(
        String token,
        UUID id,
        String email,
        String displayName,
        List<String> roles
) {
}
