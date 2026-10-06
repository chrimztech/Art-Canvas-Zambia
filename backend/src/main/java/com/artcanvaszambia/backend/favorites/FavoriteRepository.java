package com.artcanvaszambia.backend.favorites;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
    List<Favorite> findByUserIdOrderByCreatedAtDesc(UUID userId);

    boolean existsByUserIdAndArtworkId(UUID userId, UUID artworkId);

    long countByArtworkId(UUID artworkId);

    @Transactional
    void deleteByUserIdAndArtworkId(UUID userId, UUID artworkId);
}
