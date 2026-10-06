package com.artcanvaszambia.backend.supplies;

import com.artcanvaszambia.backend.admin.dto.StatusUpdateRequest;
import com.artcanvaszambia.backend.supplies.dto.SupplyDetailDto;
import com.artcanvaszambia.backend.supplies.dto.SupplyImageRequest;
import com.artcanvaszambia.backend.supplies.dto.SupplyRequest;
import com.artcanvaszambia.backend.supplies.dto.SupplySummaryDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SupplyController {
    private final SupplyService supplyService;

    @GetMapping("/api/supplies")
    public List<SupplySummaryDto> list() {
        return supplyService.listPublished();
    }

    @GetMapping("/api/supplies/{slug}")
    public SupplyDetailDto get(@PathVariable String slug) {
        return supplyService.getBySlug(slug);
    }

    @GetMapping("/api/me/supplies")
    public List<SupplySummaryDto> mine() {
        return supplyService.mine();
    }

    @PostMapping("/api/supplies")
    public SupplyDetailDto create(@Valid @RequestBody SupplyRequest req) {
        return supplyService.create(req);
    }

    @PutMapping("/api/supplies/{id}")
    public SupplyDetailDto update(@PathVariable UUID id, @Valid @RequestBody SupplyRequest req) {
        return supplyService.update(id, req);
    }

    @DeleteMapping("/api/supplies/{id}")
    public void delete(@PathVariable UUID id) {
        supplyService.delete(id);
    }

    @PatchMapping("/api/supplies/{id}/status")
    public SupplySummaryDto updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest req) {
        return supplyService.updateStatus(id, req.status());
    }

    @PostMapping("/api/supplies/{id}/images")
    public void addImage(@PathVariable UUID id, @Valid @RequestBody SupplyImageRequest req) {
        supplyService.addImage(id, req.imageUrl());
    }
}
