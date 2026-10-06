package com.artcanvaszambia.backend.messaging;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    Optional<Conversation> findByParticipantAAndParticipantBAndContextTypeAndContextId(
            UUID participantA, UUID participantB, String contextType, UUID contextId);

    Optional<Conversation> findByParticipantAAndParticipantBAndContextTypeAndContextIdIsNull(
            UUID participantA, UUID participantB, String contextType);

    @Query("select c from Conversation c where c.participantA = :me or c.participantB = :me order by c.lastMessageAt desc")
    List<Conversation> findForUser(@Param("me") UUID me, Pageable pageable);
}

interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    long countByConversationIdAndSenderIdNotAndReadAtIsNull(UUID conversationId, UUID senderId);

    long countByConversationIdAndSenderIdAndReadAtIsNull(UUID conversationId, UUID senderId);

    @Query("select count(m) from Message m where m.readAt is null and m.senderId <> :me and m.conversationId in "
            + "(select c.id from Conversation c where c.participantA = :me or c.participantB = :me)")
    long countUnreadFor(@Param("me") UUID me);

    @Modifying
    @Query("update Message m set m.readAt = :now where m.conversationId = :conversationId and m.senderId <> :me and m.readAt is null")
    int markRead(@Param("conversationId") UUID conversationId, @Param("me") UUID me, @Param("now") Instant now);
}
