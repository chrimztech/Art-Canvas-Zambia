package com.artcanvaszambia.backend.security;

import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.auth.UserRoleEntity;
import com.artcanvaszambia.backend.auth.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionOverrideRepository userPermissionOverrideRepository;

    @Override
    public AppUserPrincipal loadUserByUsername(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("No account with that email"));
        return toPrincipal(user);
    }

    public AppUserPrincipal loadUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("Account no longer exists"));
        return toPrincipal(user);
    }

    private AppUserPrincipal toPrincipal(User user) {
        Set<Role> roles = userRoleRepository.findByUserId(user.getId()).stream()
                .map(UserRoleEntity::getRole)
                .collect(Collectors.toSet());
        Set<Permission> permissions = EnumSet.noneOf(Permission.class);
        if (!roles.isEmpty()) {
            rolePermissionRepository.findByRoleIn(roles)
                    .forEach(rp -> permissions.add(rp.getPermission()));
        }
        for (UserPermissionOverrideEntity override : userPermissionOverrideRepository.findByUserId(user.getId())) {
            if (override.isGranted()) {
                permissions.add(override.getPermission());
            } else {
                permissions.remove(override.getPermission());
            }
        }
        return new AppUserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), roles, permissions);
    }
}
