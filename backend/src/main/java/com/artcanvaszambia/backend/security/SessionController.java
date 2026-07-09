package com.artcanvaszambia.backend.security;

import com.artcanvaszambia.backend.audit.AuditService;
import com.artcanvaszambia.backend.security.dto.SessionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SessionController {
    private final SessionService sessionService;
    private final AuditService auditService;

    @GetMapping("/api/me/sessions")
    public List<SessionDto> mine() {
        var principal = SecurityUtils.currentPrincipal();
        return sessionService.mine(principal.getId(), principal.getSessionId());
    }

    @DeleteMapping("/api/me/sessions/{id}")
    public void revokeMine(@PathVariable UUID id) {
        sessionService.revokeMine(SecurityUtils.currentUserId(), id);
    }

    @GetMapping("/api/admin/sessions")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN') and hasAuthority('PERM_USERS_MANAGE_SESSIONS')")
    public List<SessionDto> adminList() {
        return sessionService.adminList();
    }

    @DeleteMapping("/api/admin/sessions/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN') and hasAuthority('PERM_USERS_MANAGE_SESSIONS')")
    public void adminRevoke(@PathVariable UUID id) {
        sessionService.revoke(id);
        auditService.record("SESSION_REVOKED", "SESSION", id, null, null);
    }

    @PostMapping("/api/admin/users/{id}/sessions/revoke-all")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN') and hasAuthority('PERM_USERS_MANAGE_SESSIONS')")
    public void adminRevokeAll(@PathVariable UUID id) {
        sessionService.revokeAllForUser(id);
        auditService.record("SESSIONS_REVOKED_ALL", "USER", id, null, null);
    }
}
