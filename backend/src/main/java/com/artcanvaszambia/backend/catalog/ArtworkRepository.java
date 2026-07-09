package com.artcanvaszambia.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ArtworkRepository extends JpaRepository<Artwork, UUID> {
    Optional<Artwork> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Artwork> findByStatusInOrderByCreatedAtDesc(List<String> statuses);

    List<Artwork> findByStatusAndCategoryIdOrderByCreatedAtDesc(String status, UUID categoryId);

    List<Artwork> findByArtistIdOrderByCreatedAtDesc(UUID artistId);

    List<Artwork> findByArtistIdAndStatusOrderByCreatedAtDesc(UUID artistId, String status);

    long countByArtistId(UUID artistId);

    long countByArtistIdAndStatus(UUID artistId, String status);
}
