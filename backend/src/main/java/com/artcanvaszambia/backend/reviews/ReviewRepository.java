package com.artcanvaszambia.backend.reviews;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    Optional<Review> findByOrderItemId(UUID orderItemId);

    List<Review> findByOrderItemIdIn(Collection<UUID> orderItemIds);

    List<Review> findBySellerIdOrderByCreatedAtDesc(UUID sellerId, Pageable pageable);

    List<Review> findByReferenceIdOrderByCreatedAtDesc(UUID referenceId, Pageable pageable);

    List<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("select r.rating, count(r) from Review r where r.sellerId = :sellerId group by r.rating")
    List<Object[]> ratingHistogram(@Param("sellerId") UUID sellerId);

    @Query("select r.sellerId, avg(r.rating), count(r) from Review r where r.sellerId in :sellerIds group by r.sellerId")
    List<Object[]> averagesForSellers(@Param("sellerIds") Collection<UUID> sellerIds);
}
