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
