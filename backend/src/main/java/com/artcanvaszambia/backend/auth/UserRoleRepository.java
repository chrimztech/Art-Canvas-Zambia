package com.artcanvaszambia.backend.auth;

import com.artcanvaszambia.backend.security.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRoleEntity, UUID> {
    List<UserRoleEntity> findByUserId(UUID userId);

    boolean existsByUserIdAndRole(UUID userId, Role role);

    Optional<UserRoleEntity> findByUserIdAndRole(UUID userId, Role role);

    void deleteByUserIdAndRole(UUID userId, Role role);

    List<UserRoleEntity> findByRole(Role role);
}
