package com.artcanvaszambia.backend.supplies;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupplyImageRepository extends JpaRepository<SupplyImage, UUID> {
    List<SupplyImage> findBySupplyIdOrderBySortOrder(UUID supplyId);
}
