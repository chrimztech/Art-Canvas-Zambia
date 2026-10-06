package com.artcanvaszambia.backend.reviews;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
public class Review {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "order_item_id", nullable = false, unique = true)
    private UUID orderItemId;

    @Column(name = "reviewer_id", nullable = false)
    private UUID reviewerId;

    @Column(name = "seller_id", nullable = false)
    private UUID sellerId;

    @Column(name = "item_type", nullable = false)
    private String itemType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "item_title", nullable = false)
    private String itemTitle;

    @Column(nullable = false)
    private int rating;

    private String comment;

    @Column(name = "seller_reply")
    private String sellerReply;

    @Column(name = "seller_replied_at")
    private Instant sellerRepliedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
