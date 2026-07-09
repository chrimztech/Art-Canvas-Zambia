package com.artcanvaszambia.backend.orders;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
public class PlatformSettings {
    @Id
    private int id = 1;

    @Column(name = "platform_fee_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal platformFeePercent = new BigDecimal("10.00");

    @Column(name = "developer_royalty_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal developerRoyaltyPercent = new BigDecimal("10.00");

    @Column(nullable = false)
    private String currency = "ZMW";

    @Column(name = "payment_provider")
    private String paymentProvider;

    @Column(name = "hero_image_url")
    private String heroImageUrl;

    @Column(name = "developer_payout_method")
    private String developerPayoutMethod;

    @Column(name = "developer_payout_phone")
    private String developerPayoutPhone;

    @Column(name = "developer_payout_bank_name")
    private String developerPayoutBankName;

    @Column(name = "developer_payout_receiver_id")
    private String developerPayoutReceiverId;

    @Column(name = "owner_payout_method")
    private String ownerPayoutMethod;

    @Column(name = "owner_payout_phone")
    private String ownerPayoutPhone;

    @Column(name = "owner_payout_bank_name")
    private String ownerPayoutBankName;

    @Column(name = "owner_payout_receiver_id")
    private String ownerPayoutReceiverId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
