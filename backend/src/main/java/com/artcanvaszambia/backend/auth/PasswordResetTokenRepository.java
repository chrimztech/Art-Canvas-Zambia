package com.artcanvaszambia.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    List<PasswordResetToken> findByUserIdAndUsedAtIsNull(UUID userId);

    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);
}
