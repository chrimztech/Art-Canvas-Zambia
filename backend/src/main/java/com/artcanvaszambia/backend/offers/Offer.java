package com.artcanvaszambia.backend.offers;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * A buyer's price proposal on an artwork. Lifecycle: pending -> accepted | declined | countered;
 * countered -> accepted (buyer takes the counter) | withdrawn; accepted -> purchased.
 * Any open offer lapses to "expired" after its deadline.
 */
@Entity
@Table(name = "offers")
@Getter
@Setter
@NoArgsConstructor
public class Offer {
    public static final String PENDING = "pending";
    public static final String COUNTERED = "countered";
    public static final String ACCEPTED = "accepted";
    public static final String DECLINED = "declined";
    public static final String WITHDRAWN = "withdrawn";
    public static final String EXPIRED = "expired";
    public static final String PURCHASED = "purchased";
    public static final Set<String> OPEN = Set.of(PENDING, COUNTERED, ACCEPTED);

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "artwork_id", nullable = false)
    private UUID artworkId;

    @Column(name = "buyer_id", nullable = false)
    private UUID buyerId;

    @Column(name = "artist_id", nullable = false)
    private UUID artistId;

    /** The agreed (or proposed) price. When a counter is accepted this becomes the counter amount. */
    @Column(name = "amount_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountZmw;

    @Column(name = "counter_amount_zmw", precision = 12, scale = 2)
    private BigDecimal counterAmountZmw;

    private String message;

    @Column(nullable = false)
    private String status = PENDING;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /** Lazily lapses open offers past their deadline; returns true if the status changed. */
    public boolean expireIfDue(Instant now) {
        if (OPEN.contains(status) && expiresAt.isBefore(now)) {
            status = EXPIRED;
            return true;
        }
        return false;
    }
}
