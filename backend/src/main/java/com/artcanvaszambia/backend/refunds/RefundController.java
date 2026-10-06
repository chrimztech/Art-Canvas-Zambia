package com.artcanvaszambia.backend.refunds;

import com.artcanvaszambia.backend.refunds.dto.RefundDtos.CreateRefundRequest;
import com.artcanvaszambia.backend.refunds.dto.RefundDtos.RefundDto;
import com.artcanvaszambia.backend.refunds.dto.RefundDtos.ResolveRefundRequest;
import com.artcanvaszambia.backend.refunds.dto.RefundDtos.SellerResponseRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class RefundController {
    private final RefundService refundService;

    @PostMapping("/api/refunds")
    public RefundDto request(@Valid @RequestBody CreateRefundRequest req) {
        return refundService.request(req.orderItemId(), req.reason());
    }

    @GetMapping("/api/me/refunds")
    public List<RefundDto> mine() {
        return refundService.mine();
    }

    @GetMapping("/api/me/sales/refunds")
    public List<RefundDto> forSeller() {
        return refundService.forSeller();
    }

    @PostMapping("/api/refunds/{id}/respond")
    public RefundDto respond(@PathVariable UUID id, @Valid @RequestBody SellerResponseRequest req) {
        return refundService.sellerRespond(id, req.response());
    }

    @GetMapping("/api/admin/refunds")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN') and hasAuthority('PERM_ORDERS_MANAGE')")
    public List<RefundDto> adminList() {
        return refundService.adminList();
    }

    @PostMapping("/api/admin/refunds/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN') and hasAuthority('PERM_ORDERS_MANAGE')")
    public RefundDto resolve(@PathVariable UUID id, @Valid @RequestBody ResolveRefundRequest req) {
        return refundService.resolve(id, req.decision(), req.note());
    }
}
