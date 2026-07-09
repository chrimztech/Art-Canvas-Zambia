package com.artcanvaszambia.backend.orders;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {
    List<OrderItem> findByOrderId(UUID orderId);

    List<OrderItem> findByOrderIdIn(Collection<UUID> orderIds);

    List<OrderItem> findByArtistIdOrderByCreatedAtDesc(UUID artistId);

    List<OrderItem> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);
}
