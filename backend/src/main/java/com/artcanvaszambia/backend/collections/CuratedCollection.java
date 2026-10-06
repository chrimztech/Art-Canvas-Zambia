package com.artcanvaszambia.backend.collections;

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

/** An editorial grouping of artworks ("New this week", "Under K2,000", "Zambezi landscapes"…). */
@Entity
@Table(name = "collections")
@Getter
@Setter
@NoArgsConstructor
public class CuratedCollection {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(nullable = false)
    private boolean featured;

    @Column(nullable = false)
    private boolean published = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
