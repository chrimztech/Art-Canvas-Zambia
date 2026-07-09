package com.artcanvaszambia.backend.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserPermissionOverrideRepository extends JpaRepository<UserPermissionOverrideEntity, UUID> {
    List<UserPermissionOverrideEntity> findByUserId(UUID userId);

    Optional<UserPermissionOverrideEntity> findByUserIdAndPermission(UUID userId, Permission permission);

    void deleteByUserIdAndPermission(UUID userId, Permission permission);
}
