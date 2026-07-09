package com.artcanvaszambia.backend.cart;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cart_items")
@Getter
@Setter
@NoArgsConstructor
public class CartItem {
    public static final String ARTWORK = "ARTWORK";
    public static final String SUPPLY = "SUPPLY";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "artwork_id")
    private UUID artworkId;

    @Column(name = "item_type", nullable = false)
    private String itemType = ARTWORK;

    @Column(name = "item_id")
    private UUID itemId;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
