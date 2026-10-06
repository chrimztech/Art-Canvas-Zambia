package com.artcanvaszambia.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Browser sessions ride on two cookies:
 * <ul>
 *   <li>{@value #TOKEN_COOKIE}: the JWT, HttpOnly so page scripts (and any XSS) can never read it;</li>
 *   <li>{@value #SESSION_HINT_COOKIE}: a non-secret "1" readable by the frontend (and its SSR server)
 *       just to know a session exists without an API round trip.</li>
 * </ul>
 */
@Component
public class AuthCookies {
    public static final String TOKEN_COOKIE = "acz_token";
    public static final String SESSION_HINT_COOKIE = "acz_session";

    private final String domain;
    private final boolean secure;
    private final String sameSite;
    private final Duration maxAge;

    public AuthCookies(@Value("${app.auth.cookie-domain:}") String domain,
                       @Value("${app.auth.cookie-secure:false}") boolean secure,
                       @Value("${app.auth.cookie-same-site:Lax}") String sameSite,
                       @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        this.domain = domain;
        this.secure = secure;
        this.sameSite = sameSite;
        this.maxAge = Duration.ofMinutes(expirationMinutes);
    }

    public void write(HttpServletResponse response, String token) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(TOKEN_COOKIE, token, maxAge, true));
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(SESSION_HINT_COOKIE, "1", maxAge, false));
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(TOKEN_COOKIE, "", Duration.ZERO, true));
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(SESSION_HINT_COOKIE, "", Duration.ZERO, false));
    }

    public static String readToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (TOKEN_COOKIE.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }

    private String cookie(String name, String value, Duration age, boolean httpOnly) {
        ResponseCookie.ResponseCookieBuilder b = ResponseCookie.from(name, value)
                .path("/")
                .httpOnly(httpOnly)
                .secure(secure || "None".equalsIgnoreCase(sameSite))
                .sameSite(sameSite)
                .maxAge(age);
        if (domain != null && !domain.isBlank()) b.domain(domain);
        return b.build().toString();
    }
}
