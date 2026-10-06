package com.artcanvaszambia.backend.refunds;

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

@Entity
@Table(name = "refund_requests")
@Getter
@Setter
@NoArgsConstructor
public class RefundRequest {
    public static final String REQUESTED = "requested";
    public static final String REFUNDED = "refunded";
    public static final String REJECTED = "rejected";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "order_item_id", nullable = false)
    private UUID orderItemId;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "buyer_id", nullable = false)
    private UUID buyerId;

    @Column(name = "seller_id")
    private UUID sellerId;

    @Column(name = "amount_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountZmw;

    @Column(nullable = false)
    private String reason;

    @Column(nullable = false)
    private String status = REQUESTED;

    @Column(name = "seller_response")
    private String sellerResponse;

    @Column(name = "admin_note")
    private String adminNote;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
