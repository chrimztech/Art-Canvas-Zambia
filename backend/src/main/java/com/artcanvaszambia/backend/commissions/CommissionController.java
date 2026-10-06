package com.artcanvaszambia.backend.commissions;

import com.artcanvaszambia.backend.commissions.dto.*;
import com.artcanvaszambia.backend.orders.CheckoutService;
import com.artcanvaszambia.backend.orders.OrderItem;
import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CommissionController {
    private final CommissionService commissionService;
    private final CheckoutService checkoutService;

    @PostMapping("/api/commissions")
    public CommissionDto create(@Valid @RequestBody CommissionCreateRequest req) {
        return commissionService.create(req);
    }

    @GetMapping("/api/me/commissions")
    public List<CommissionDto> mine() {
        return commissionService.mine();
    }

    @GetMapping("/api/me/commissions/assigned")
    public List<CommissionDto> assigned() {
        return commissionService.assigned();
    }

    @GetMapping("/api/commissions/open")
    public List<CommissionDto> open() {
        return commissionService.open();
    }

    @PostMapping("/api/commissions/{id}/claim")
    public CommissionDto claim(@PathVariable UUID id, @RequestBody(required = false) CommissionClaimRequest req) {
        return commissionService.claim(id, req);
    }

    @PostMapping("/api/commissions/{id}/quote")
    public CommissionDto quote(@PathVariable UUID id, @RequestBody CommissionClaimRequest req) {
        return commissionService.quote(id, req);
    }

    @PostMapping("/api/commissions/{id}/release")
    public CommissionDto release(@PathVariable UUID id) {
        return commissionService.release(id);
    }

    /** Customer accepts the quote by paying it; the commission moves to "accepted" once payment clears. */
    @PostMapping("/api/commissions/{id}/checkout")
    public CheckoutResponse checkout(@PathVariable UUID id, @Valid @RequestBody CheckoutRequest req) {
        return checkoutService.checkoutSingleItem(OrderItem.COMMISSION, id, 1, req);
    }

    @PatchMapping("/api/commissions/{id}/status")
    public CommissionDto updateStatus(@PathVariable UUID id, @Valid @RequestBody CommissionStatusRequest req) {
        return commissionService.updateStatus(id, req.status());
    }

    @DeleteMapping("/api/commissions/{id}")
    public void delete(@PathVariable UUID id) {
        commissionService.delete(id);
    }
}
