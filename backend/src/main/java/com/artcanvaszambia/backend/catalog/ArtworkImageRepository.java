package com.artcanvaszambia.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ArtworkImageRepository extends JpaRepository<ArtworkImage, UUID> {
    List<ArtworkImage> findByArtworkIdOrderBySortOrder(UUID artworkId);
}
