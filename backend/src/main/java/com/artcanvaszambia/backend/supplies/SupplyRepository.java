package com.artcanvaszambia.backend.supplies;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplyRepository extends JpaRepository<Supply, UUID> {
    Optional<Supply> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Supply> findByStatusOrderByCreatedAtDesc(String status);

    List<Supply> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);
}
