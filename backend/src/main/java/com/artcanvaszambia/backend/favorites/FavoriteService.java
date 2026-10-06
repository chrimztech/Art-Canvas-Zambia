package com.artcanvaszambia.backend.favorites;

import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.catalog.ArtworkService;
import com.artcanvaszambia.backend.catalog.dto.ArtworkSummaryDto;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final ArtworkRepository artworkRepository;
    private final ArtworkService artworkService;

    public List<ArtworkSummaryDto> mine() {
        List<UUID> ids = ids();
        Map<UUID, Artwork> artworks = artworkRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Artwork::getId, Function.identity()));
        // Keep most-recently-saved first and drop pieces that have since been unpublished.
        List<Artwork> ordered = ids.stream().map(artworks::get).filter(Objects::nonNull)
                .filter(a -> Artwork.PUBLISHED.equals(a.getStatus()) || Artwork.SOLD.equals(a.getStatus()))
                .toList();
        return artworkService.toSummaries(ordered);
    }

    public List<UUID> ids() {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()).stream()
                .map(Favorite::getArtworkId).toList();
    }

    @Transactional
    public void add(UUID artworkId) {
        UUID userId = SecurityUtils.currentUserId();
        if (!artworkRepository.existsById(artworkId)) {
            throw ApiException.notFound("Artwork not found");
        }
        if (!favoriteRepository.existsByUserIdAndArtworkId(userId, artworkId)) {
            favoriteRepository.save(new Favorite(userId, artworkId));
        }
    }

    @Transactional
    public void remove(UUID artworkId) {
        favoriteRepository.deleteByUserIdAndArtworkId(SecurityUtils.currentUserId(), artworkId);
    }
}
