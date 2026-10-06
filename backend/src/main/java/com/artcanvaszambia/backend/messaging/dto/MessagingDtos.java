package com.artcanvaszambia.backend.messaging.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class MessagingDtos {
    private MessagingDtos() {
    }

    /** Start (or continue) a conversation with another user, optionally about a listing, order or commission. */
    public record StartConversationRequest(
            @NotNull UUID recipientId,
            String contextType,
            UUID contextId,
            @NotBlank @Size(max = 4000) String body
    ) {
    }

    public record SendMessageRequest(@NotBlank @Size(max = 4000) String body) {
    }

    public record ConversationSummaryDto(
            UUID id,
            UUID otherUserId,
            String otherDisplayName,
            String otherAvatarUrl,
            String subject,
            String contextType,
            UUID contextId,
            // Where the context lives on the site for this viewer, e.g. "/artworks/sunset" (null for general chats).
            String contextPath,
            String lastMessagePreview,
            boolean lastMessageMine,
            Instant lastMessageAt,
            long unreadCount
    ) {
    }

    public record MessageDto(UUID id, UUID senderId, boolean mine, String body, Instant createdAt, Instant readAt) {
    }

    public record ConversationDetailDto(ConversationSummaryDto conversation, List<MessageDto> messages) {
    }
}
