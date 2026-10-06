package com.artcanvaszambia.backend.orders;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
public class OrderItem {
    public static final String ARTWORK = "ARTWORK";
    public static final String SUPPLY = "SUPPLY";
    public static final String CLASS = "CLASS";
    public static final String EXHIBITION = "EXHIBITION";
    public static final String COMMISSION = "COMMISSION";

    public static final String FULFILLMENT_PENDING = "pending";
    public static final String FULFILLMENT_SHIPPED = "shipped";
    public static final String FULFILLMENT_DELIVERED = "delivered";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "artwork_id")
    private UUID artworkId;

    @Column(name = "artist_id")
    private UUID artistId;

    @Column(name = "item_type", nullable = false)
    private String itemType = "ARTWORK";

    @Column(name = "seller_id")
    private UUID sellerId;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(nullable = false)
    private String title;

    @Column(name = "unit_price_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceZmw;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "line_total_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotalZmw = BigDecimal.ZERO;

    @Column(name = "platform_fee_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal platformFeeZmw = BigDecimal.ZERO;

    @Column(name = "royalty_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal royaltyZmw = BigDecimal.ZERO;

    @Column(name = "artist_payout_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal artistPayoutZmw = BigDecimal.ZERO;

    @Column(name = "fulfillment_status", nullable = false)
    private String fulfillmentStatus = FULFILLMENT_PENDING;

    private String carrier;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "shipped_at")
    private Instant shippedAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    /** Set when an admin approves a refund; refunded items don't count towards seller earnings. */
    @Column(name = "refunded_at")
    private Instant refundedAt;


    /** Coupon discount applied to this line (seller payout and fees are computed after it). */
    @Column(name = "discount_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountZmw = BigDecimal.ZERO;

    /** Delivery fee for this line; passed to the seller in full. */
    @Column(name = "shipping_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingZmw = BigDecimal.ZERO;

    /** The accepted offer this line was bought through, if any. */
    @Column(name = "offer_id")
    private UUID offerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /** Artworks and supplies are shipped; classes, tickets and commissions are fulfilled digitally. */
    public boolean isPhysical() {
        return ARTWORK.equals(itemType) || SUPPLY.equals(itemType);
    }
}
