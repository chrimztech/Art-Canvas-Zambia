package com.artcanvaszambia.backend.auth;

import com.artcanvaszambia.backend.auth.dto.AuthResponse;
import com.artcanvaszambia.backend.auth.dto.LoginRequest;
import com.artcanvaszambia.backend.auth.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request) {
        return authService.register(req, clientIp(request), request.getHeader("User-Agent"));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest request) {
        return authService.login(req, clientIp(request), request.getHeader("User-Agent"));
    }

    @PostMapping("/logout")
    public void logout() {
        authService.logout();
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
