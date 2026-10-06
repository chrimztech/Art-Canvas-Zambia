package com.artcanvaszambia.backend.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    List<CartItem> findByUserId(UUID userId);

    Optional<CartItem> findByUserIdAndArtworkId(UUID userId, UUID artworkId);

    Optional<CartItem> findByUserIdAndItemTypeAndItemId(UUID userId, String itemType, UUID itemId);

    @Transactional
    void deleteByUserId(UUID userId);

    @Transactional
    void deleteByUserIdAndItemIdIn(UUID userId, java.util.Collection<UUID> itemIds);
}
