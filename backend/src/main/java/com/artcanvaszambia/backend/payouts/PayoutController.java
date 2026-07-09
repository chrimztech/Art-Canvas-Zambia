package com.artcanvaszambia.backend.payouts;

import com.artcanvaszambia.backend.payouts.dto.AvailableBalanceDto;
import com.artcanvaszambia.backend.payouts.dto.CreatePayoutRequest;
import com.artcanvaszambia.backend.payouts.dto.PayoutRequestDto;
import com.artcanvaszambia.backend.payouts.dto.PlatformBalanceDto;
import com.artcanvaszambia.backend.payouts.dto.RejectPayoutRequest;
import com.artcanvaszambia.backend.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PayoutController {
    private final PayoutService payoutService;

    @GetMapping("/api/me/payouts")
    public List<PayoutRequestDto> mine() {
        return payoutService.mine();
    }

    @GetMapping("/api/me/payouts/balance")
    public AvailableBalanceDto myBalance() {
        return payoutService.availableBalance(SecurityUtils.currentUserId());
    }

    @PostMapping("/api/me/payouts")
    public PayoutRequestDto create(@Valid @RequestBody CreatePayoutRequest req) {
        return payoutService.create(req);
    }

    @GetMapping("/api/admin/payouts")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<PayoutRequestDto> adminList() {
        return payoutService.adminList();
    }

    @PostMapping("/api/admin/payouts/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('ADMIN') and hasAuthority('PERM_PAYOUTS_APPROVE'))")
    public PayoutRequestDto approve(@PathVariable UUID id) {
        return payoutService.approve(id);
    }

    @PostMapping("/api/admin/payouts/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public PayoutRequestDto reject(@PathVariable UUID id, @RequestBody(required = false) RejectPayoutRequest req) {
        return payoutService.reject(id, req != null ? req.note() : null);
    }

    @GetMapping("/api/admin/platform-payouts/balance")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PlatformBalanceDto platformBalance(@RequestParam String payeeType) {
        return payoutService.availablePlatformBalance(payeeType.toUpperCase());
    }

    @PostMapping("/api/admin/platform-payouts")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PayoutRequestDto createPlatformPayout(@RequestParam String payeeType) {
        return payoutService.createPlatformPayout(payeeType.toUpperCase());
    }
}
