package com.artcanvaszambia.backend.commissions;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "commissions")
@Getter
@Setter
@NoArgsConstructor
public class Commission {
    public static final String REQUESTED = "requested";
    public static final String QUOTED = "quoted";
    public static final String ACCEPTED = "accepted";
    public static final String IN_PROGRESS = "in_progress";
    public static final String DELIVERED = "delivered";
    public static final String COMPLETED = "completed";
    public static final String CANCELLED = "cancelled";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "artist_id")
    private UUID artistId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String brief;

    @Column(name = "budget_zmw", precision = 12, scale = 2)
    private BigDecimal budgetZmw;

    @Column(name = "quoted_price_zmw", precision = 12, scale = 2)
    private BigDecimal quotedPriceZmw;

    private LocalDate deadline;

    @Column(nullable = false)
    private String status = REQUESTED;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
