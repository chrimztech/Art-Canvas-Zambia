package com.artcanvaszambia.backend.payouts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PayoutRequestRepository extends JpaRepository<PayoutRequest, UUID> {
    List<PayoutRequest> findByArtistIdOrderByCreatedAtDesc(UUID artistId);

    List<PayoutRequest> findByPayeeTypeOrderByCreatedAtDesc(String payeeType);

    List<PayoutRequest> findAllByOrderByCreatedAtDesc();

    Optional<PayoutRequest> findByReferenceNo(String referenceNo);

    boolean existsByReferenceNo(String referenceNo);
}
