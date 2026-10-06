package com.artcanvaszambia.backend.profile;

import com.artcanvaszambia.backend.profile.dto.ProfileDto;
import com.artcanvaszambia.backend.profile.dto.ProfileUpdateRequest;
import com.artcanvaszambia.backend.profile.dto.PublicProfileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profileService;

    @GetMapping("/api/profiles/{id}")
    public PublicProfileDto get(@PathVariable UUID id) {
        return profileService.getPublic(id);
    }

    @GetMapping("/api/me/profile")
    public ProfileDto mine() {
        return profileService.mine();
    }

    @PostMapping("/api/me/verification-request")
    public ProfileDto requestVerification() {
        return profileService.requestVerification();
    }

    @PutMapping("/api/me/profile")
    public ProfileDto updateMine(@RequestBody ProfileUpdateRequest req) {
        return profileService.updateMine(req);
    }
}
