package com.artcanvaszambia.backend.exhibitions;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "exhibition_tickets")
@Getter
@Setter
@NoArgsConstructor
public class ExhibitionTicket {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "exhibition_id", nullable = false)
    private UUID exhibitionId;

    @Column(name = "buyer_id", nullable = false)
    private UUID buyerId;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "total_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalZmw = BigDecimal.ZERO;

    @Column(nullable = false)
    private String status = "pending";

    @Column(name = "qr_code")
    private String qrCode;

    @Column(name = "order_item_id")
    private UUID orderItemId;

    @Column(name = "checked_in_at")
    private Instant checkedInAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
