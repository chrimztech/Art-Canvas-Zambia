package com.artcanvaszambia.backend.offers;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OfferRepository extends JpaRepository<Offer, UUID> {
    List<Offer> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    List<Offer> findByArtistIdOrderByCreatedAtDesc(UUID artistId);

    List<Offer> findByArtworkIdAndStatusIn(UUID artworkId, Collection<String> statuses);

    List<Offer> findByArtworkIdAndBuyerIdAndStatusIn(UUID artworkId, UUID buyerId, Collection<String> statuses);
}
