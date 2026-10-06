package com.artcanvaszambia.backend.coupons;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.security.Role;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Sellers manage codes for their own shop; admins manage platform-wide codes. */
@RestController
@RequiredArgsConstructor
public class CouponController {
    private final CouponRepository couponRepository;

    public record CouponRequest(String code, BigDecimal percentOff, BigDecimal amountOffZmw, BigDecimal minOrderZmw,
                                Instant startsAt, Instant endsAt, Integer maxRedemptions) {
    }

    public record CouponDto(UUID id, String code, boolean platform, BigDecimal percentOff, BigDecimal amountOffZmw,
                            BigDecimal minOrderZmw, Instant startsAt, Instant endsAt, Integer maxRedemptions,
                            int redemptions, boolean active, String status, Instant createdAt) {
        static CouponDto from(Coupon c) {
            String reason = c.unusableReason(Instant.now());
            return new CouponDto(c.getId(), c.getCode(), c.getSellerId() == null, c.getPercentOff(), c.getAmountOffZmw(),
                    c.getMinOrderZmw(), c.getStartsAt(), c.getEndsAt(), c.getMaxRedemptions(), c.getRedemptions(),
                    c.isActive(), reason == null ? "Live" : reason, c.getCreatedAt());
        }
    }

    @GetMapping("/api/me/coupons")
    public List<CouponDto> mine() {
        return couponRepository.findBySellerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()).stream().map(CouponDto::from).toList();
    }

    @PostMapping("/api/me/coupons")
    @Transactional
    public CouponDto create(@RequestBody CouponRequest req) {
        SecurityUtils.requireAnyRole("Only sellers can create coupons", Role.ARTIST, Role.SUPPLIER, Role.INSTRUCTOR);
        return CouponDto.from(save(req, SecurityUtils.currentUserId()));
    }

    @PatchMapping("/api/me/coupons/{id}")
    @Transactional
    public CouponDto toggle(@PathVariable UUID id, @RequestBody Map<String, Boolean> body) {
        Coupon c = owned(id);
        c.setActive(Boolean.TRUE.equals(body.get("active")));
        return CouponDto.from(couponRepository.save(c));
    }

    @DeleteMapping("/api/me/coupons/{id}")
    @Transactional
    public void delete(@PathVariable UUID id) {
        Coupon c = owned(id);
        if (c.getRedemptions() > 0) {
            // Keep redeemed codes for order history; just switch them off.
            c.setActive(false);
            couponRepository.save(c);
        } else {
            couponRepository.delete(c);
        }
    }

    @GetMapping("/api/admin/coupons")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<CouponDto> platformCoupons() {
        return couponRepository.findBySellerIdIsNullOrderByCreatedAtDesc().stream().map(CouponDto::from).toList();
    }

    @PostMapping("/api/admin/coupons")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Transactional
    public CouponDto createPlatform(@RequestBody CouponRequest req) {
        return CouponDto.from(save(req, null));
    }

    @PatchMapping("/api/admin/coupons/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Transactional
    public CouponDto togglePlatform(@PathVariable UUID id, @RequestBody Map<String, Boolean> body) {
        Coupon c = couponRepository.findById(id).filter(x -> x.getSellerId() == null)
                .orElseThrow(() -> ApiException.notFound("Coupon not found"));
        c.setActive(Boolean.TRUE.equals(body.get("active")));
        return CouponDto.from(couponRepository.save(c));
    }

    private Coupon owned(UUID id) {
        return couponRepository.findById(id).filter(c -> SecurityUtils.currentUserId().equals(c.getSellerId()))
                .orElseThrow(() -> ApiException.notFound("Coupon not found"));
    }

    private Coupon save(CouponRequest req, UUID sellerId) {
        String code = req.code() == null ? "" : req.code().trim().toUpperCase();
        if (!code.matches("[A-Z0-9_-]{3,30}")) {
            throw ApiException.badRequest("Codes are 3–30 letters, numbers, - or _");
        }
        if (couponRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw ApiException.conflict("That code is already taken");
        }
        boolean pct = req.percentOff() != null, amt = req.amountOffZmw() != null;
        if (pct == amt) throw ApiException.badRequest("Choose either a percentage or a fixed amount off");
        if (pct && (req.percentOff().signum() <= 0 || req.percentOff().compareTo(BigDecimal.valueOf(90)) > 0)) {
            throw ApiException.badRequest("Percentage must be between 1 and 90");
        }
        if (amt && req.amountOffZmw().signum() <= 0) throw ApiException.badRequest("Amount off must be positive");
        if (req.startsAt() != null && req.endsAt() != null && !req.endsAt().isAfter(req.startsAt())) {
            throw ApiException.badRequest("The end date must be after the start date");
        }
        Coupon c = new Coupon();
        c.setCode(code);
        c.setSellerId(sellerId);
        c.setPercentOff(req.percentOff());
        c.setAmountOffZmw(req.amountOffZmw());
        c.setMinOrderZmw(req.minOrderZmw());
        c.setStartsAt(req.startsAt());
        c.setEndsAt(req.endsAt());
        c.setMaxRedemptions(req.maxRedemptions());
        return couponRepository.save(c);
    }
}
