package com.artcanvaszambia.backend.collections;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CollectionController {
    private final CollectionService collectionService;

    @GetMapping("/api/collections")
    public List<CollectionService.CollectionSummaryDto> list(@RequestParam(defaultValue = "false") boolean featured) {
        return collectionService.list(featured, false);
    }

    @GetMapping("/api/collections/{slug}")
    public CollectionService.CollectionDetailDto get(@PathVariable String slug) {
        return collectionService.get(slug);
    }

    @GetMapping("/api/admin/collections")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<CollectionService.CollectionSummaryDto> adminList() {
        return collectionService.list(false, true);
    }

    @PostMapping("/api/admin/collections")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public CollectionService.CollectionDetailDto create(@RequestBody CollectionService.CollectionRequest req) {
        return collectionService.save(null, req);
    }

    @PutMapping("/api/admin/collections/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public CollectionService.CollectionDetailDto update(@PathVariable UUID id, @RequestBody CollectionService.CollectionRequest req) {
        return collectionService.save(id, req);
    }

    @DeleteMapping("/api/admin/collections/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public void delete(@PathVariable UUID id) {
        collectionService.delete(id);
    }
}
