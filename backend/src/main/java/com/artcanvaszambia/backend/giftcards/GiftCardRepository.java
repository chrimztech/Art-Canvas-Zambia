package com.artcanvaszambia.backend.giftcards;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GiftCardRepository extends JpaRepository<GiftCard, UUID> {
    @Query("select g from GiftCard g where upper(g.code) = upper(:code)")
    Optional<GiftCard> findByCodeIgnoreCase(@Param("code") String code);

    Optional<GiftCard> findByOrderItemId(UUID orderItemId);

    List<GiftCard> findByPurchaserIdOrderByCreatedAtDesc(UUID purchaserId);

    boolean existsByCode(String code);
}
