package com.artcanvaszambia.backend.refunds;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, UUID> {
    boolean existsByOrderItemIdAndStatus(UUID orderItemId, String status);

    List<RefundRequest> findByOrderItemIdIn(Collection<UUID> orderItemIds);

    List<RefundRequest> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    List<RefundRequest> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);

    List<RefundRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
