package com.artcanvaszambia.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface ArtworkImageRepository extends JpaRepository<ArtworkImage, UUID> {
    List<ArtworkImage> findByArtworkIdOrderBySortOrder(UUID artworkId);

    @Transactional
    void deleteByArtworkId(UUID artworkId);
}
