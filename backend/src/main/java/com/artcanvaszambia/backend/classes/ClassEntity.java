package com.artcanvaszambia.backend.classes;

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
@Table(name = "classes")
@Getter
@Setter
@NoArgsConstructor
public class ClassEntity {
    public static final String DRAFT = "draft";
    public static final String PUBLISHED = "published";
    public static final String CANCELLED = "cancelled";
    public static final String COMPLETED = "completed";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "instructor_id", nullable = false)
    private UUID instructorId;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(nullable = false)
    private String mode = "in_person";

    private String location;

    @Column(name = "meeting_url")
    private String meetingUrl;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Column(nullable = false)
    private int capacity = 10;

    @Column(name = "price_zmw", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceZmw = BigDecimal.ZERO;

    @Column(nullable = false)
    private String status = DRAFT;

    @Column(name = "skill_level")
    private String skillLevel;

    private String prerequisites;

    private String syllabus;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "tags", columnDefinition = "text[]")
    private List<String> tags = new ArrayList<>();

    @Column(name = "materials_included", nullable = false)
    private boolean materialsIncluded = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
