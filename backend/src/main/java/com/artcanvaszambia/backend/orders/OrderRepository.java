package com.artcanvaszambia.backend.orders;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    Optional<Order> findByOrderNumber(String orderNumber);

    List<Order> findByStatusIn(Collection<String> statuses);
}
