package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.orders.dto.PublicSiteSettingsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PublicSiteController {
    private final PlatformSettingsRepository platformSettingsRepository;
    private final com.artcanvaszambia.backend.payments.PaymentProviders paymentProviders;
    private final com.artcanvaszambia.backend.payments.LencoClient lencoClient;

    /** Zambian banks supported for payouts when Lenco is the gateway (empty otherwise). */
    @GetMapping("/api/public/banks")
    public java.util.List<String> banks() {
        if (!com.artcanvaszambia.backend.payments.PaymentProviders.LENCO.equals(paymentProviders.active())) {
            return java.util.List.of();
        }
        try {
            return lencoClient.banks().stream().map(b -> b.get("name")).sorted().toList();
        } catch (RuntimeException e) {
            return java.util.List.of();
        }
    }

    @GetMapping("/api/public/site-settings")
    public PublicSiteSettingsDto siteSettings() {
        PlatformSettings s = platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new);
        return new PublicSiteSettingsDto(s.getHeroImageUrl(), paymentProviders.active());
    }
}
