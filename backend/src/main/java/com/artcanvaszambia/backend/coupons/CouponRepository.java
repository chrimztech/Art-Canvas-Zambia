package com.artcanvaszambia.backend.coupons;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CouponRepository extends JpaRepository<Coupon, UUID> {
    @Query("select c from Coupon c where upper(c.code) = upper(:code)")
    Optional<Coupon> findByCodeIgnoreCase(@Param("code") String code);

    List<Coupon> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);

    List<Coupon> findBySellerIdIsNullOrderByCreatedAtDesc();

    @Modifying
    @Query("update Coupon c set c.redemptions = c.redemptions + 1 where upper(c.code) = upper(:code)")
    int incrementRedemptions(@Param("code") String code);
}
