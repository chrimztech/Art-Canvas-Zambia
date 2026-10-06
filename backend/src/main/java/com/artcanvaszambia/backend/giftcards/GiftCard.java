package com.artcanvaszambia.backend.giftcards;

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

/** A prepaid balance bought at checkout ("pending" until paid) and spent on later orders. */
@Entity
@Table(name = "gift_cards")
@Getter
@Setter
@NoArgsConstructor
public class GiftCard {
    public static final String PENDING = "pending";
    public static final String ACTIVE = "active";
    public static final String DISABLED = "disabled";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "initial_amount_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal initialAmountZmw;

    @Column(name = "balance_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceZmw;

    @Column(name = "purchaser_id")
    private UUID purchaserId;

    @Column(name = "recipient_email")
    private String recipientEmail;

    @Column(name = "recipient_name")
    private String recipientName;

    private String message;

    @Column(name = "order_item_id")
    private UUID orderItemId;

    @Column(nullable = false)
    private String status = PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
