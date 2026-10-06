package com.artcanvaszambia.backend.social;

import com.artcanvaszambia.backend.catalog.dto.ArtworkSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SocialController {
    private final SocialService socialService;

    @PutMapping("/api/me/follows/{artistId}")
    public void follow(@PathVariable UUID artistId) {
        socialService.follow(artistId);
    }

    @DeleteMapping("/api/me/follows/{artistId}")
    public void unfollow(@PathVariable UUID artistId) {
        socialService.unfollow(artistId);
    }

    @GetMapping("/api/me/follows")
    public List<SocialService.FollowedArtistDto> following() {
        return socialService.following();
    }

    @GetMapping("/api/me/feed")
    public List<ArtworkSummaryDto> feed() {
        return socialService.feed();
    }

    @GetMapping("/api/me/saved-searches")
    public List<SocialService.SavedSearchDto> savedSearches() {
        return socialService.savedSearches();
    }

    @PostMapping("/api/me/saved-searches")
    public SocialService.SavedSearchDto save(@RequestBody SocialService.SavedSearchRequest req) {
        return socialService.saveSearch(req);
    }

    @DeleteMapping("/api/me/saved-searches/{id}")
    public void delete(@PathVariable UUID id) {
        socialService.deleteSearch(id);
    }
}
