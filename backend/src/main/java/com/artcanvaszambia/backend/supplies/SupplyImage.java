package com.artcanvaszambia.backend.supplies;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "supply_images")
@Getter
@Setter
@NoArgsConstructor
public class SupplyImage {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "supply_id", nullable = false)
    private UUID supplyId;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public SupplyImage(UUID supplyId, String imageUrl, int sortOrder) {
        this.supplyId = supplyId;
        this.imageUrl = imageUrl;
        this.sortOrder = sortOrder;
    }
}
