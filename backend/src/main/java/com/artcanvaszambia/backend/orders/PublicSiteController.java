package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.orders.dto.PublicSiteSettingsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PublicSiteController {
    private final PlatformSettingsRepository platformSettingsRepository;

    @GetMapping("/api/public/site-settings")
    public PublicSiteSettingsDto siteSettings() {
        PlatformSettings s = platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new);
        return new PublicSiteSettingsDto(s.getHeroImageUrl());
    }
}
