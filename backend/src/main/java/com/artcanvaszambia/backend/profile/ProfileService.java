package com.artcanvaszambia.backend.profile;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.profile.dto.ProfileDto;
import com.artcanvaszambia.backend.profile.dto.ProfileUpdateRequest;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final ProfileRepository profileRepository;

    public ProfileDto get(UUID id) {
        return profileRepository.findById(id).map(ProfileDto::from)
                .orElseThrow(() -> ApiException.notFound("Profile not found"));
    }

    @Transactional
    public ProfileDto updateMine(ProfileUpdateRequest req) {
        UUID id = SecurityUtils.currentUserId();
        Profile profile = profileRepository.findById(id).orElseThrow(() -> ApiException.notFound("Profile not found"));
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
