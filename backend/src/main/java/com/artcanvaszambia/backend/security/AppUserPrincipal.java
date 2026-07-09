package com.artcanvaszambia.backend.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class AppUserPrincipal implements UserDetails {
    private final UUID id;
    private final String email;
    private final String passwordHash;
    private final Set<Role> roles;
    private final Set<Permission> permissions;
    private UUID sessionId;

    public AppUserPrincipal(UUID id, String email, String passwordHash, Set<Role> roles, Set<Permission> permissions) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.roles = roles;
        this.permissions = permissions;
    }

    public UUID getId() {
        return id;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }

    public boolean hasRole(Role role) {
        return roles.contains(role);
    }

    public boolean hasPermission(Permission permission) {
        return permissions.contains(permission);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Stream<SimpleGrantedAuthority> roleAuthorities = roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r.name()));
        Stream<SimpleGrantedAuthority> permissionAuthorities = permissions.stream().map(p -> new SimpleGrantedAuthority("PERM_" + p.name()));
        return Stream.concat(roleAuthorities, permissionAuthorities).collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }
}
