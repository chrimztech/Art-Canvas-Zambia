package com.artcanvaszambia.backend.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "artwork_images")
@Getter
@Setter
@NoArgsConstructor
public class ArtworkImage {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "artwork_id", nullable = false)
    private UUID artworkId;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ArtworkImage(UUID artworkId, String imageUrl, int sortOrder) {
        this.artworkId = artworkId;
        this.imageUrl = imageUrl;
        this.sortOrder = sortOrder;
    }
}
