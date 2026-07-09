package com.artcanvaszambia.backend.orders;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
public class Order {
    public static final String PENDING = "pending";
    public static final String PAID = "paid";
    public static final String FULFILLED = "fulfilled";
    public static final String CANCELLED = "cancelled";
    public static final String REFUNDED = "refunded";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "buyer_id", nullable = false)
    private UUID buyerId;

    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    @Column(nullable = false)
    private String status = PENDING;

    @Column(name = "subtotal_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotalZmw = BigDecimal.ZERO;

    @Column(name = "platform_fee_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal platformFeeZmw = BigDecimal.ZERO;

    @Column(name = "royalty_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal royaltyZmw = BigDecimal.ZERO;

    @Column(name = "total_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalZmw = BigDecimal.ZERO;

    @Column(name = "payment_provider")
    private String paymentProvider;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
