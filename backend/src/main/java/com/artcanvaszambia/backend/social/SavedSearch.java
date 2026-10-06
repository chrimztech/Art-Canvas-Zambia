package com.artcanvaszambia.backend.social;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Criteria a collector wants to be alerted about when new work is published. */
@Entity
@Table(name = "saved_searches")
@Getter
@Setter
@NoArgsConstructor
public class SavedSearch {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    private String query;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "min_price_zmw", precision = 12, scale = 2)
    private BigDecimal minPriceZmw;

    @Column(name = "max_price_zmw", precision = 12, scale = 2)
    private BigDecimal maxPriceZmw;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
