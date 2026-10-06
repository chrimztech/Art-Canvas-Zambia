package com.artcanvaszambia.backend.auth;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.security.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Self-service "forgot password". Tokens are random, single-use, valid for one hour and stored
 * only as a hash. Requesting a reset never reveals whether an email is registered.
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {
    private static final Duration TOKEN_TTL = Duration.ofHours(1);
    private static final int MAX_REQUESTS_PER_HOUR = 3;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessionService sessionService;
    private final NotificationService notificationService;

    @Transactional
    public void requestReset(String email) {
        if (email == null || email.isBlank()) return;
        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            Instant now = Instant.now();
            if (tokenRepository.countByUserIdAndCreatedAtAfter(user.getId(), now.minus(Duration.ofHours(1))) >= MAX_REQUESTS_PER_HOUR) {
                return; // silently throttle; the response is identical either way
            }
            byte[] bytes = new byte[32];
            RANDOM.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            PasswordResetToken t = new PasswordResetToken();
            t.setUserId(user.getId());
            t.setTokenHash(hash(token));
            t.setExpiresAt(now.plus(TOKEN_TTL));
            tokenRepository.save(t);
            notificationService.passwordReset(user, token);
        });
    }

    @Transactional
    public void reset(String token, String newPassword) {
        PasswordResetToken t = tokenRepository.findByTokenHash(hash(token == null ? "" : token))
                .orElseThrow(() -> ApiException.badRequest("This reset link is invalid or has already been used"));
        if (t.getUsedAt() != null || t.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("This reset link has expired. Please request a new one.");
        }
        User user = userRepository.findById(t.getUserId())
                .orElseThrow(() -> ApiException.badRequest("This reset link is invalid or has already been used"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        // Burn this and any other outstanding links, and sign the account out everywhere.
        Instant now = Instant.now();
        for (PasswordResetToken other : tokenRepository.findByUserIdAndUsedAtIsNull(user.getId())) {
            other.setUsedAt(now);
            tokenRepository.save(other);
        }
        sessionService.revokeAllForUser(user.getId());
        notificationService.passwordChanged(user);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
