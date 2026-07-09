package com.artcanvaszambia.backend.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RolePermissionRepository extends JpaRepository<RolePermissionEntity, UUID> {
    List<RolePermissionEntity> findByRoleIn(Collection<Role> roles);

    List<RolePermissionEntity> findByRole(Role role);

    void deleteByRole(Role role);
}
