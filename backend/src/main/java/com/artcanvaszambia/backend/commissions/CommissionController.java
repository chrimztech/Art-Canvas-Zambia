package com.artcanvaszambia.backend.commissions;

import com.artcanvaszambia.backend.commissions.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CommissionController {
    private final CommissionService commissionService;

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
        return commissionService.claim(id, req != null ? req : new CommissionClaimRequest(null));
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
