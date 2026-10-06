package com.artcanvaszambia.backend.coupons;

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
import java.util.UUID;

/**
 * A discount code. Seller coupons (sellerId set) only discount that seller's items; platform
 * coupons (sellerId null, created by admins) discount the whole order. Exactly one of
 * percentOff / amountOffZmw is set.
 */
@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
public class Coupon {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String code;

    @Column(name = "seller_id")
    private UUID sellerId;

    @Column(name = "percent_off", precision = 5, scale = 2)
    private BigDecimal percentOff;

    @Column(name = "amount_off_zmw", precision = 12, scale = 2)
    private BigDecimal amountOffZmw;

    @Column(name = "min_order_zmw", precision = 12, scale = 2)
    private BigDecimal minOrderZmw;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "max_redemptions")
    private Integer maxRedemptions;

    @Column(nullable = false)
    private int redemptions;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /** Null when usable now, otherwise the reason it can't be used. */
    public String unusableReason(Instant now) {
        if (!active) return "This code is no longer active";
        if (startsAt != null && now.isBefore(startsAt)) return "This code isn't valid yet";
        if (endsAt != null && now.isAfter(endsAt)) return "This code has expired";
        if (maxRedemptions != null && redemptions >= maxRedemptions) return "This code has been fully used";
        return null;
    }
}
