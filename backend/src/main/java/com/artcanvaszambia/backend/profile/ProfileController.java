package com.artcanvaszambia.backend.profile;

import com.artcanvaszambia.backend.profile.dto.ProfileDto;
import com.artcanvaszambia.backend.profile.dto.ProfileUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profileService;

    @GetMapping("/api/profiles/{id}")
    public ProfileDto get(@PathVariable UUID id) {
        return profileService.get(id);
    }

    @PutMapping("/api/me/profile")
    public ProfileDto updateMine(@RequestBody ProfileUpdateRequest req) {
        return profileService.updateMine(req);
    }
}
