package com.artcanvaszambia.backend.security;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_permission_overrides", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "permission"}))
@Getter
@Setter
@NoArgsConstructor
public class UserPermissionOverrideEntity {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Permission permission;

    @Column(nullable = false)
    private boolean granted;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UserPermissionOverrideEntity(UUID userId, Permission permission, boolean granted, UUID createdBy) {
        this.userId = userId;
        this.permission = permission;
        this.granted = granted;
        this.createdBy = createdBy;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
