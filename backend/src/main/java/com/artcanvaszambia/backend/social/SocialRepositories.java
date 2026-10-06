package com.artcanvaszambia.backend.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

interface FollowRepository extends JpaRepository<Follow, Follow.Key> {
    boolean existsByFollowerIdAndArtistId(UUID followerId, UUID artistId);

    long countByArtistId(UUID artistId);

    List<Follow> findByFollowerIdOrderByCreatedAtDesc(UUID followerId);

    List<Follow> findByArtistId(UUID artistId);

    @Transactional
    void deleteByFollowerIdAndArtistId(UUID followerId, UUID artistId);
}

interface SavedSearchRepository extends JpaRepository<SavedSearch, UUID> {
    List<SavedSearch> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserId(UUID userId);
}
