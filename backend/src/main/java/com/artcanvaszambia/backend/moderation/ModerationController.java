package com.artcanvaszambia.backend.moderation;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ModerationController {
    private final ModerationService moderationService;

    @PostMapping("/api/reports")
    public void report(@RequestBody ModerationService.ReportRequest req) {
        moderationService.report(req);
    }

    @GetMapping("/api/admin/reports")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<ModerationService.ReportDto> reports() {
        return moderationService.adminList();
    }

    @PostMapping("/api/admin/reports/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public void resolve(@PathVariable UUID id, @RequestBody ModerationService.ResolveRequest req) {
        moderationService.resolve(id, req);
    }

    @PutMapping("/api/me/blocks/{userId}")
    public void block(@PathVariable UUID userId) {
        moderationService.block(userId);
    }

    @DeleteMapping("/api/me/blocks/{userId}")
    public void unblock(@PathVariable UUID userId) {
        moderationService.unblock(userId);
    }

    @GetMapping("/api/me/blocks")
    public List<ModerationService.BlockedUserDto> blocked() {
        return moderationService.blocked();
    }
}
