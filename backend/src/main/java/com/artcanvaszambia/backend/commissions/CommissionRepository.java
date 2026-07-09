package com.artcanvaszambia.backend.commissions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommissionRepository extends JpaRepository<Commission, UUID> {
    List<Commission> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    List<Commission> findByArtistIdOrderByCreatedAtDesc(UUID artistId);

    List<Commission> findByStatusAndArtistIdIsNullOrderByCreatedAtDesc(String status);
}
