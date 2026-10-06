package com.artcanvaszambia.backend.notifications;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class NotificationController {
    private final UserNotificationRepository repository;

    public record NotificationDto(UUID id, String title, String body, String link, Instant readAt, Instant createdAt) {
    }

    @GetMapping("/api/me/notifications")
    public List<NotificationDto> mine() {
        return repository.findByUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId(), PageRequest.of(0, 50)).stream()
                .map(n -> new NotificationDto(n.getId(), n.getTitle(), n.getBody(), n.getLink(), n.getReadAt(), n.getCreatedAt()))
                .toList();
    }

    @GetMapping("/api/me/notifications/unread-count")
    public Map<String, Long> unread() {
        return Map.of("count", repository.countByUserIdAndReadAtIsNull(SecurityUtils.currentUserId()));
    }

    @PostMapping("/api/me/notifications/{id}/read")
    @Transactional
    public void markRead(@PathVariable UUID id) {
        UserNotification n = repository.findById(id)
                .filter(x -> x.getUserId().equals(SecurityUtils.currentUserId()))
                .orElseThrow(() -> ApiException.notFound("Notification not found"));
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            repository.save(n);
        }
    }

    @PostMapping("/api/me/notifications/read-all")
    @Transactional
    public void markAllRead() {
        repository.markAllRead(SecurityUtils.currentUserId(), Instant.now());
    }
}
