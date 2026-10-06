package com.artcanvaszambia.backend.security;

import com.artcanvaszambia.backend.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class SecurityUtils {
    private SecurityUtils() {
    }

    public static AppUserPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw ApiException.unauthorized("You must be signed in");
        }
        return principal;
    }

    /** The signed-in principal, or null on anonymous requests (for public endpoints with owner-only extras). */
    public static AppUserPrincipal currentPrincipalOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AppUserPrincipal principal ? principal : null;
    }

    /** True when the caller is signed in and is either {@code ownerId} or an admin. */
    public static boolean isOwnerOrAdmin(UUID ownerId) {
        AppUserPrincipal p = currentPrincipalOrNull();
        return p != null && (p.getId().equals(ownerId) || p.hasRole(Role.ADMIN) || p.hasRole(Role.SUPER_ADMIN));
    }

    public static void requireAnyRole(String message, Role... roles) {
        AppUserPrincipal p = currentPrincipal();
        if (p.hasRole(Role.ADMIN) || p.hasRole(Role.SUPER_ADMIN)) return;
        for (Role role : roles) {
            if (p.hasRole(role)) return;
        }
        throw ApiException.forbidden(message);
    }

    public static UUID currentUserId() {
        return currentPrincipal().getId();
    }

    public static boolean isAdminOrAbove() {
        AppUserPrincipal p = currentPrincipal();
        return p.hasRole(Role.ADMIN) || p.hasRole(Role.SUPER_ADMIN);
    }

    public static boolean isSuperAdmin() {
        return currentPrincipal().hasRole(Role.SUPER_ADMIN);
    }

    public static boolean hasPermission(Permission permission) {
        return currentPrincipal().hasPermission(permission);
    }

    public static void requirePermission(Permission permission) {
        if (!hasPermission(permission)) {
            throw ApiException.forbidden("You don't have permission to do that");
        }
    }

    public static void requireOwnerOrAdmin(UUID ownerId) {
        AppUserPrincipal p = currentPrincipal();
        boolean owner = p.getId().equals(ownerId);
        boolean admin = p.hasRole(Role.ADMIN) || p.hasRole(Role.SUPER_ADMIN);
        if (!owner && !admin) {
            throw ApiException.forbidden("You don't have permission to do that");
        }
    }
}
