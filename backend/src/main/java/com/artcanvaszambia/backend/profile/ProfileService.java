package com.artcanvaszambia.backend.profile;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.profile.dto.ProfileDto;
import com.artcanvaszambia.backend.profile.dto.ProfileUpdateRequest;
import com.artcanvaszambia.backend.profile.dto.PublicProfileDto;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final ProfileRepository profileRepository;

    public PublicProfileDto getPublic(UUID id) {
        return profileRepository.findById(id).map(PublicProfileDto::from)
                .orElseThrow(() -> ApiException.notFound("Profile not found"));
    }

    public ProfileDto mine() {
        return profileRepository.findById(SecurityUtils.currentUserId()).map(ProfileDto::from)
                .orElseThrow(() -> ApiException.notFound("Profile not found"));
    }

    @Transactional
    public ProfileDto updateMine(ProfileUpdateRequest req) {
        UUID id = SecurityUtils.currentUserId();
        Profile profile = profileRepository.findById(id).orElseThrow(() -> ApiException.notFound("Profile not found"));
        if (req.displayName() == null || req.displayName().isBlank()) {
            throw ApiException.badRequest("Display name is required");
        }
        if (req.payoutMethod() != null && !req.payoutMethod().isBlank()
                && !"momo".equals(req.payoutMethod()) && !"bank".equals(req.payoutMethod())) {
            throw ApiException.badRequest("Payout method must be momo or bank");
        }
        if (req.yearsExperience() != null && req.yearsExperience() < 0) {
            throw ApiException.badRequest("Years of experience can't be negative");
        }
        profile.setDisplayName(req.displayName());
        profile.setBio(req.bio());
        profile.setAvatarUrl(req.avatarUrl());
        profile.setLocation(req.location());
        profile.setWebsite(req.website());
        profile.setInstagram(req.instagram());
        profile.setPhone(req.phone());
        profile.setCoverImageUrl(req.coverImageUrl());
        profile.setFacebookUrl(req.facebookUrl());
        profile.setTwitterUrl(req.twitterUrl());
        profile.setTiktokUrl(req.tiktokUrl());
        profile.setSpecialties(req.specialties() != null ? req.specialties() : java.util.List.of());
        profile.setYearsExperience(req.yearsExperience());
        profile.setPayoutMethod(req.payoutMethod());
        profile.setPayoutPhone(req.payoutPhone());
        profile.setPayoutBankName(req.payoutBankName());
        profile.setPayoutReceiverId(req.payoutReceiverId());
        return ProfileDto.from(profileRepository.save(profile));
    }
}
