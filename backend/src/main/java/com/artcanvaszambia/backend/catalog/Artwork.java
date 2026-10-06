package com.artcanvaszambia.backend.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "artworks")
@Getter
@Setter
@NoArgsConstructor
public class Artwork {
    public static final String DRAFT = "draft";
    public static final String PUBLISHED = "published";
    public static final String SOLD = "sold";
    public static final String ARCHIVED = "archived";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "artist_id", nullable = false)
    private UUID artistId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    private String description;

    private String medium;

    private String dimensions;

    @Column(name = "year_created")
    private Integer yearCreated;

    @Column(name = "price_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceZmw;

    @Column(name = "is_original", nullable = false)
    private boolean isOriginal = true;

    @Column(name = "edition_size")
    private Integer editionSize;

    @Column(nullable = false)
    private String status = DRAFT;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(name = "view_count", nullable = false)
    private int viewCount = 0;

    private String materials;

    private String style;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "tags", columnDefinition = "text[]")
    private List<String> tags = new ArrayList<>();

    @Column(name = "weight_kg", precision = 8, scale = 2)
    private BigDecimal weightKg;

    @Column(nullable = false)
    private boolean framed = false;

    private String provenance;

    @Column(nullable = false)
    private boolean signed = false;

    @Column(name = "signature_location")
    private String signatureLocation;

    @Column(name = "certificate_of_authenticity", nullable = false)
    private boolean certificateOfAuthenticity = false;

    private String surface;

    private String orientation;

    @Column(name = "shipping_notes")
    private String shippingNotes;

    @Column(name = "ready_to_hang", nullable = false)
    private boolean readyToHang = false;

    @Column(name = "origin_city")
    private String originCity;

    @Column(name = "origin_country")
    private String originCountry;


    /** Flat delivery fee added at checkout when the buyer chooses delivery (0 = free delivery). */
    @Column(name = "shipping_fee_zmw", nullable = false, precision = 12, scale = 2)
    private java.math.BigDecimal shippingFeeZmw = java.math.BigDecimal.ZERO;

    @Column(name = "accepts_offers", nullable = false)
    private boolean acceptsOffers = true;

    /** When followers and saved-search alerts were sent; null until first published. */
    @Column(name = "announced_at")
    private Instant announcedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
