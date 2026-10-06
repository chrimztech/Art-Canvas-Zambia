package com.artcanvaszambia.backend.messaging;

import com.artcanvaszambia.backend.messaging.dto.MessagingDtos.ConversationDetailDto;
import com.artcanvaszambia.backend.messaging.dto.MessagingDtos.ConversationSummaryDto;
import com.artcanvaszambia.backend.messaging.dto.MessagingDtos.SendMessageRequest;
import com.artcanvaszambia.backend.messaging.dto.MessagingDtos.StartConversationRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MessagingController {
    private final MessagingService messagingService;

    @PostMapping("/api/conversations")
    public ConversationDetailDto start(@Valid @RequestBody StartConversationRequest req) {
        return messagingService.start(req);
    }

    @GetMapping("/api/me/conversations")
    public List<ConversationSummaryDto> mine() {
        return messagingService.mine();
    }

    @GetMapping("/api/me/messages/unread-count")
    public Map<String, Long> unread() {
        return Map.of("count", messagingService.unreadCount());
    }

    /** Opening a thread marks the other person's messages as read. */
    @GetMapping("/api/conversations/{id}")
    public ConversationDetailDto read(@PathVariable UUID id) {
        return messagingService.read(id);
    }

    @PostMapping("/api/conversations/{id}/messages")
    public ConversationDetailDto send(@PathVariable UUID id, @Valid @RequestBody SendMessageRequest req) {
        return messagingService.send(id, req.body());
    }
}
