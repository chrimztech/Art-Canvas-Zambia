package com.artcanvaszambia.backend.social;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** A collector following an artist. */
@Entity
@Table(name = "follows")
@IdClass(Follow.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class Follow {
    @Id
    @Column(name = "follower_id")
    private UUID followerId;

    @Id
    @Column(name = "artist_id")
    private UUID artistId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    Follow(UUID followerId, UUID artistId) {
        this.followerId = followerId;
        this.artistId = artistId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private UUID followerId;
        private UUID artistId;
    }
}

