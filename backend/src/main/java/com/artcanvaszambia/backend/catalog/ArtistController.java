package com.artcanvaszambia.backend.catalog;

import com.artcanvaszambia.backend.catalog.dto.ArtistDetailDto;
import com.artcanvaszambia.backend.catalog.dto.ArtistSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ArtistController {
    private final ArtistService artistService;

    @GetMapping("/api/artists")
    public List<ArtistSummaryDto> list() {
        return artistService.list();
    }

    @GetMapping("/api/artists/{id}")
    public ArtistDetailDto get(@PathVariable UUID id) {
        return artistService.get(id);
    }
}
