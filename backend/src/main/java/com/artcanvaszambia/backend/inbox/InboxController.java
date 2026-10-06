package com.artcanvaszambia.backend.inbox;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class InboxController {
    private final InboxService inboxService;

    @PostMapping("/api/public/contact")
    public Map<String, String> contact(@RequestBody InboxService.ContactRequest req) {
        inboxService.contact(req);
        return Map.of("message", "Thanks — we'll get back to you within 1–2 business days.");
    }

    @PostMapping("/api/public/newsletter")
    public Map<String, String> subscribe(@RequestBody Map<String, String> body) {
        inboxService.subscribe(body.get("email"));
        return Map.of("message", "You're subscribed. Look out for new work and events in your inbox.");
    }

    @PostMapping("/api/public/newsletter/unsubscribe")
    public Map<String, String> unsubscribe(@RequestBody Map<String, String> body) {
        inboxService.unsubscribe(body.get("token"));
        return Map.of("message", "You've been unsubscribed.");
    }

    @GetMapping("/api/admin/contact-messages")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<InboxService.ContactMessageDto> messages() {
        return inboxService.adminMessages();
    }

    @PatchMapping("/api/admin/contact-messages/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public void setStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        inboxService.setStatus(id, body.get("status"));
    }

    @GetMapping("/api/admin/newsletter")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<InboxService.SubscriberDto> subscribers() {
        return inboxService.subscribers();
    }
}
