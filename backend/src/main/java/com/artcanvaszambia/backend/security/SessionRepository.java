package com.artcanvaszambia.backend.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SessionRepository extends JpaRepository<SessionEntity, UUID> {
    List<SessionEntity> findByUserIdOrderByLastSeenAtDesc(UUID userId);

    List<SessionEntity> findAllByOrderByLastSeenAtDesc();
}
