package com.artcanvaszambia.backend.messaging;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
public class Conversation {
    @Id
    @GeneratedValue
    private UUID id;

    /** Always the smaller of the two user ids (enforced by a DB check). */
    @Column(name = "participant_a", nullable = false)
    private UUID participantA;

    @Column(name = "participant_b", nullable = false)
    private UUID participantB;

    private String subject;

    @Column(name = "context_type", nullable = false)
    private String contextType = "GENERAL";

    @Column(name = "context_id")
    private UUID contextId;

    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public boolean involves(UUID userId) {
        return participantA.equals(userId) || participantB.equals(userId);
    }

    public UUID otherParticipant(UUID userId) {
        return participantA.equals(userId) ? participantB : participantA;
    }
}
