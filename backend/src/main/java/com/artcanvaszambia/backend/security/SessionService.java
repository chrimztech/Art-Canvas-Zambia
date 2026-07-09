package com.artcanvaszambia.backend.security;

import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.dto.SessionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionService {
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;

    @Transactional
    public SessionEntity create(UUID userId, String ipAddress, String userAgent, Instant expiresAt) {
        SessionEntity session = new SessionEntity(UUID.randomUUID(), userId, ipAddress, userAgent, expiresAt);
        return sessionRepository.save(session);
    }

    public boolean isActive(UUID sessionId) {
        if (sessionId == null) return false;
        return sessionRepository.findById(sessionId).map(SessionEntity::isActive).orElse(false);
    }

    @Transactional
    public void touch(UUID sessionId) {
        if (sessionId == null) return;
        sessionRepository.findById(sessionId).ifPresent(session -> {
            session.setLastSeenAt(Instant.now());
            sessionRepository.save(session);
        });
    }

    public List<SessionDto> mine(UUID userId, UUID currentSessionId) {
        return sessionRepository.findByUserIdOrderByLastSeenAtDesc(userId).stream()
                .map(s -> toDto(s, currentSessionId))
                .toList();
    }

    @Transactional
    public void revokeMine(UUID userId, UUID sessionId) {
        SessionEntity session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> ApiException.notFound("Session not found"));
        if (!session.getUserId().equals(userId)) {
            throw ApiException.forbidden("You don't have permission to do that");
        }
        session.setRevokedAt(Instant.now());
        sessionRepository.save(session);
    }

    public List<SessionDto> adminList() {
        List<SessionEntity> sessions = sessionRepository.findAllByOrderByLastSeenAtDesc();
        Map<UUID, Profile> profiles = profileRepository.findByIdIn(sessions.stream().map(SessionEntity::getUserId).distinct().toList())
                .stream().collect(Collectors.toMap(Profile::getId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(sessions.stream().map(SessionEntity::getUserId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return sessions.stream().map(s -> {
            Profile p = profiles.get(s.getUserId());
            User u = users.get(s.getUserId());
            return new SessionDto(s.getId(), s.getUserId(), p != null ? p.getDisplayName() : null,
                    u != null ? u.getEmail() : null, s.getIpAddress(), s.getUserAgent(), s.getCreatedAt(),
                    s.getLastSeenAt(), s.getExpiresAt(), false, s.isActive());
        }).toList();
    }

    @Transactional
    public void revoke(UUID sessionId) {
        SessionEntity session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> ApiException.notFound("Session not found"));
        session.setRevokedAt(Instant.now());
        sessionRepository.save(session);
    }

    @Transactional
    public void revokeAllForUser(UUID userId) {
        sessionRepository.findByUserIdOrderByLastSeenAtDesc(userId).stream()
                .filter(SessionEntity::isActive)
                .forEach(session -> {
                    session.setRevokedAt(Instant.now());
                    sessionRepository.save(session);
                });
    }

    private SessionDto toDto(SessionEntity s, UUID currentSessionId) {
        return new SessionDto(s.getId(), s.getUserId(), null, null, s.getIpAddress(), s.getUserAgent(),
                s.getCreatedAt(), s.getLastSeenAt(), s.getExpiresAt(), s.getId().equals(currentSessionId), s.isActive());
    }
}
