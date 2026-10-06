package com.artcanvaszambia.backend.auth;

import com.artcanvaszambia.backend.auth.dto.AuthResponse;
import com.artcanvaszambia.backend.auth.dto.ForgotPasswordRequest;
import com.artcanvaszambia.backend.auth.dto.LoginRequest;
import com.artcanvaszambia.backend.auth.dto.RegisterRequest;
import com.artcanvaszambia.backend.auth.dto.ResetPasswordRequest;
import com.artcanvaszambia.backend.security.AuthCookies;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final AuthCookies authCookies;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request, HttpServletResponse response) {
        AuthResponse auth = authService.register(req, clientIp(request), request.getHeader("User-Agent"));
        authCookies.write(response, auth.token());
        return auth;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        AuthResponse auth = authService.login(req, clientIp(request), request.getHeader("User-Agent"));
        authCookies.write(response, auth.token());
        return auth;
    }

    /** Ends the current session (if any) and always clears the browser's auth cookies. */
    @PostMapping("/logout")
    public void logout(HttpServletResponse response) {
        authService.logout();
        authCookies.clear(response);
    }

    /** Always answers the same way so the endpoint can't be used to discover registered emails. */
    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        passwordResetService.requestReset(req.email());
        return Map.of("message", "If an account exists for that email, we've sent a link to reset the password.");
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest req, HttpServletResponse response) {
        passwordResetService.reset(req.token(), req.newPassword());
        authCookies.clear(response);
        return Map.of("message", "Your password has been reset. Please sign in.");
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
