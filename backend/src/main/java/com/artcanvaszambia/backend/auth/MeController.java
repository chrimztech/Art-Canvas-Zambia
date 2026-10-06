package com.artcanvaszambia.backend.auth;

import com.artcanvaszambia.backend.auth.dto.AuthResponse;
import com.artcanvaszambia.backend.auth.dto.ChangePasswordRequest;
import com.artcanvaszambia.backend.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MeController {
    private final AuthService authService;

    @GetMapping("/api/me")
    public AuthResponse me() {
        return authService.me(SecurityUtils.currentPrincipal());
    }

    @PostMapping("/api/me/become-artist")
    public AuthResponse becomeArtist() {
        authService.becomeArtist();
        return authService.me(SecurityUtils.currentPrincipal());
    }

    @PostMapping("/api/me/roles/{role}")
    public AuthResponse becomeRole(@PathVariable String role) {
        authService.becomeRole(role);
        return authService.me(SecurityUtils.currentPrincipal());
    }

    @PostMapping("/api/me/password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(req.currentPassword(), req.newPassword());
    }
}
