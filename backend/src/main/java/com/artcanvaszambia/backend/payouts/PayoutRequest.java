package com.artcanvaszambia.backend.payouts;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payout_requests")
@Getter
@Setter
@NoArgsConstructor
public class PayoutRequest {
    public static final String REQUESTED = "requested";
    public static final String APPROVED = "approved";
    public static final String PROCESSING = "processing";
    public static final String PAID = "paid";
    public static final String FAILED = "failed";
    public static final String REJECTED = "rejected";

    public static final String PAYEE_SELLER = "SELLER";
    public static final String PAYEE_DEVELOPER = "DEVELOPER";
    public static final String PAYEE_OWNER = "OWNER";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "artist_id")
    private UUID artistId;

    @Column(name = "payee_type", nullable = false)
    private String payeeType = PAYEE_SELLER;

    @Column(name = "amount_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountZmw;

    @Column(nullable = false)
    private String method;

    private String phone;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "receiver_id")
    private String receiverId;

    @Column(name = "reference_no", nullable = false, unique = true)
    private String referenceNo;

    @Column(nullable = false)
    private String status = REQUESTED;

    @Column(name = "transaction_id")
    private String transactionId;

    @Column(name = "operator_reference")
    private String operatorReference;

    @Column(name = "admin_note")
    private String adminNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
