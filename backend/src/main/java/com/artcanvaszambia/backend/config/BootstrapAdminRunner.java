package com.artcanvaszambia.backend.config;

import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.auth.UserRoleEntity;
import com.artcanvaszambia.backend.auth.UserRoleRepository;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.Role;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class BootstrapAdminRunner implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.email}")
    private String adminEmail;

    @Value("${app.bootstrap-admin.password}")
    private String adminPassword;

    @Value("${app.bootstrap-admin.legacy-email:}")
    private String legacyAdminEmail;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.existsByEmailIgnoreCase(adminEmail)) {
            return;
        }

        if (legacyAdminEmail != null && !legacyAdminEmail.isBlank()) {
            userRepository.findByEmailIgnoreCase(legacyAdminEmail).ifPresent(legacy -> {
                legacy.setEmail(adminEmail.toLowerCase());
                legacy.setPasswordHash(passwordEncoder.encode(adminPassword));
                userRepository.save(legacy);
                log.info("Migrated legacy bootstrap admin {} -> {}", legacyAdminEmail, adminEmail);
            });
            if (userRepository.existsByEmailIgnoreCase(adminEmail)) {
                return;
            }
        }

        User admin = new User();
        admin.setEmail(adminEmail.toLowerCase());
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin = userRepository.save(admin);

        profileRepository.save(new Profile(admin.getId(), "Platform Admin", null));
        userRoleRepository.save(new UserRoleEntity(admin.getId(), Role.SUPER_ADMIN));

        log.info("Bootstrap super-admin created: {} / (password from app.bootstrap-admin.password)", adminEmail);
    }
}
