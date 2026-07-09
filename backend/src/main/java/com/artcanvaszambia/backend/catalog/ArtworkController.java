package com.artcanvaszambia.backend.catalog;

import com.artcanvaszambia.backend.catalog.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ArtworkController {
    private final ArtworkService artworkService;

    @GetMapping("/api/artworks")
    public List<ArtworkSummaryDto> list(@RequestParam(required = false) UUID categoryId) {
        return artworkService.listPublished(categoryId);
    }

    @GetMapping("/api/artworks/{slug}")
    public ArtworkDetailDto getBySlug(@PathVariable String slug) {
        return artworkService.getBySlug(slug);
    }

    @GetMapping("/api/me/artworks")
    public List<ArtworkSummaryDto> mine() {
        return artworkService.listMine();
    }

    @GetMapping("/api/me/artworks/{id}")
    public ArtworkDetailDto mineDetail(@PathVariable UUID id) {
        return artworkService.getByIdForOwner(id);
    }

    @PostMapping("/api/artworks")
    public ArtworkDetailDto create(@Valid @RequestBody ArtworkRequest req) {
        return artworkService.create(req);
    }

    @PutMapping("/api/artworks/{id}")
    public ArtworkDetailDto update(@PathVariable UUID id, @Valid @RequestBody ArtworkRequest req) {
        return artworkService.update(id, req);
    }

    @PatchMapping("/api/artworks/{id}/status")
    public ArtworkSummaryDto updateStatus(@PathVariable UUID id, @Valid @RequestBody ArtworkStatusRequest req) {
        return artworkService.updateStatus(id, req.status());
    }

    @PostMapping("/api/artworks/{id}/images")
    public void addImage(@PathVariable UUID id, @Valid @RequestBody ImageRequest req) {
        artworkService.addImage(id, req.imageUrl());
    }

    @DeleteMapping("/api/artworks/{id}")
    public void delete(@PathVariable UUID id) {
        artworkService.delete(id);
    }
}
