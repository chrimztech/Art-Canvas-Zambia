package com.artcanvaszambia.backend.auth;

import com.artcanvaszambia.backend.auth.dto.AuthResponse;
import com.artcanvaszambia.backend.auth.dto.LoginRequest;
import com.artcanvaszambia.backend.auth.dto.RegisterRequest;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.AppUserPrincipal;
import com.artcanvaszambia.backend.security.JwtService;
import com.artcanvaszambia.backend.security.Role;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.security.SessionEntity;
import com.artcanvaszambia.backend.security.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final SessionService sessionService;

    private static final Set<String> SELF_ASSIGNABLE_ROLES = Set.of("ARTIST", "INSTRUCTOR", "SUPPLIER", "STUDENT");

    @Transactional
    public AuthResponse register(RegisterRequest req, String ipAddress, String userAgent) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("An account with that email already exists");
        }
        User user = new User();
        user.setEmail(req.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user = userRepository.save(user);

        Profile profile = new Profile(user.getId(), req.displayName(), null);
        profile.setPhone(blankToNull(req.phone()));
        profile.setLocation(blankToNull(req.location()));
        profile.setBio(blankToNull(req.bio()));
        profileRepository.save(profile);

        userRoleRepository.save(new UserRoleEntity(user.getId(), Role.CUSTOMER));

        List<Role> roles = new java.util.ArrayList<>();
        roles.add(Role.CUSTOMER);
        if (req.intendedRole() != null) {
            String intended = req.intendedRole().trim().toUpperCase();
            if (SELF_ASSIGNABLE_ROLES.contains(intended)) {
                Role role = Role.valueOf(intended);
                userRoleRepository.save(new UserRoleEntity(user.getId(), role));
                roles.add(role);
            }
        }

        SessionEntity session = sessionService.create(user.getId(), ipAddress, userAgent, jwtService.computeExpiry());
        String token = jwtService.generateToken(user.getId(), user.getEmail(), session.getId());
        return new AuthResponse(token, user.getId(), user.getEmail(), profile.getDisplayName(),
                roles.stream().map(Enum::name).collect(Collectors.toList()));
    }

    public AuthResponse login(LoginRequest req, String ipAddress, String userAgent) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.password()));

        User user = userRepository.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        Profile profile = profileRepository.findById(user.getId()).orElse(null);
        List<String> roles = userRoleRepository.findByUserId(user.getId()).stream()
                .map(r -> r.getRole().name()).collect(Collectors.toList());

        SessionEntity session = sessionService.create(user.getId(), ipAddress, userAgent, jwtService.computeExpiry());
        String token = jwtService.generateToken(user.getId(), user.getEmail(), session.getId());
        return new AuthResponse(token, user.getId(), user.getEmail(),
                profile != null ? profile.getDisplayName() : null, roles);
    }

    public void logout() {
        AppUserPrincipal principal = SecurityUtils.currentPrincipal();
        if (principal.getSessionId() != null) {
            sessionService.revoke(principal.getSessionId());
        }
    }

    public AuthResponse me(AppUserPrincipal principal) {
        Profile profile = profileRepository.findById(principal.getId()).orElse(null);
        List<String> roles = userRoleRepository.findByUserId(principal.getId()).stream()
                .map(r -> r.getRole().name()).collect(Collectors.toList());
        return new AuthResponse(null, principal.getId(), principal.getUsername(),
                profile != null ? profile.getDisplayName() : null, roles);
    }

    @Transactional
    public void becomeArtist() {
        becomeRole(Role.ARTIST);
    }

    @Transactional
    public void becomeRole(Role role) {
        var principal = com.artcanvaszambia.backend.security.SecurityUtils.currentPrincipal();
        if (!userRoleRepository.existsByUserIdAndRole(principal.getId(), role)) {
            userRoleRepository.save(new UserRoleEntity(principal.getId(), role));
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
