package com.artcanvaszambia.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

/**
 * Authenticates from an "Authorization: Bearer" header (API clients) or the HttpOnly session cookie
 * (browsers). Cookies are sent automatically by the browser, so a cookie-authenticated state-changing
 * request must also carry the X-Requested-With header: a cross-site form or image can't add it, and a
 * cross-site script can't either without passing the CORS allow-list. That closes CSRF.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final SessionService sessionService;
    private final AuthCookies authCookies;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        boolean fromCookie = false;
        String token = null;
        if (header != null && header.startsWith("Bearer ")) {
            token = header.substring(7);
        } else {
            token = AuthCookies.readToken(request);
            fromCookie = token != null;
        }

        boolean csrfBlocked = fromCookie && !SAFE_METHODS.contains(request.getMethod())
                && request.getHeader("X-Requested-With") == null;
        if (token != null && !csrfBlocked) {
            try {
                UUID userId = jwtService.extractUserId(token);
                UUID sessionId = jwtService.extractSessionId(token);
                if (sessionId != null && !sessionService.isActive(sessionId)) {
                    throw new IllegalStateException("Session is no longer active");
                }
                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    AppUserPrincipal principal = userDetailsService.loadUserById(userId);
                    principal.setSessionId(sessionId);
                    var authToken = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    if (sessionId != null) {
                        sessionService.touch(sessionId);
                    }
                }
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
                if (fromCookie) {
                    // Expired or revoked: drop the dead cookies so the frontend sees a signed-out state.
                    authCookies.clear(response);
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
