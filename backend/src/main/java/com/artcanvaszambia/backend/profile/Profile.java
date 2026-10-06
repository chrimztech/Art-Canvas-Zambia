package com.artcanvaszambia.backend.profile;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Getter
@Setter
@NoArgsConstructor
public class Profile {
    @Id
    private UUID id;

    @Column(name = "display_name")
    private String displayName;

    private String bio;

    @Column(name = "avatar_url")
    private String avatarUrl;

    private String location;

    private String website;

    private String instagram;

    private String phone;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(name = "facebook_url")
    private String facebookUrl;

    @Column(name = "twitter_url")
    private String twitterUrl;

    @Column(name = "tiktok_url")
    private String tiktokUrl;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "specialties", columnDefinition = "text[]")
    private List<String> specialties = new ArrayList<>();

    @Column(name = "years_experience")
    private Integer yearsExperience;

    @Column(name = "is_verified", nullable = false)
    private boolean verified = false;

    @Column(name = "payout_method")
    private String payoutMethod;

    @Column(name = "payout_phone")
    private String payoutPhone;

    @Column(name = "payout_bank_name")
    private String payoutBankName;

    @Column(name = "payout_receiver_id")
    private String payoutReceiverId;


    @Column(name = "shop_announcement")
    private String shopAnnouncement;

    /** While on, the seller's artworks and supplies can't be bought. */
    @Column(name = "vacation_mode", nullable = false)
    private boolean vacationMode = false;

    @Column(name = "vacation_message")
    private String vacationMessage;

    @Column(name = "return_policy")
    private String returnPolicy;

    @Column(name = "verification_requested_at")
    private Instant verificationRequestedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Profile(UUID id, String displayName, String avatarUrl) {
        this.id = id;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
