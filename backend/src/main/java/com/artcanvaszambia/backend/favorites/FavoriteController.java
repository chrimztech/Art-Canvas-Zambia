package com.artcanvaszambia.backend.favorites;

import com.artcanvaszambia.backend.catalog.dto.ArtworkSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteService favoriteService;

    @GetMapping("/api/me/favorites")
    public List<ArtworkSummaryDto> mine() {
        return favoriteService.mine();
    }

    @GetMapping("/api/me/favorites/ids")
    public List<UUID> ids() {
        return favoriteService.ids();
    }

    @PutMapping("/api/me/favorites/{artworkId}")
    public void add(@PathVariable UUID artworkId) {
        favoriteService.add(artworkId);
    }

    @DeleteMapping("/api/me/favorites/{artworkId}")
    public void remove(@PathVariable UUID artworkId) {
        favoriteService.remove(artworkId);
    }
}
