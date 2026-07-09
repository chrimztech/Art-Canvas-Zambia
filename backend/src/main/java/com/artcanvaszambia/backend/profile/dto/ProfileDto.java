package com.artcanvaszambia.backend.profile.dto;

import com.artcanvaszambia.backend.profile.Profile;

import java.util.List;
import java.util.UUID;

public record ProfileDto(
        UUID id,
        String displayName,
        String bio,
        String avatarUrl,
        String location,
        String website,
        String instagram,
        String phone,
        String coverImageUrl,
        String facebookUrl,
        String twitterUrl,
        String tiktokUrl,
        List<String> specialties,
        Integer yearsExperience,
        boolean verified,
        String payoutMethod,
        String payoutPhone,
        String payoutBankName,
        String payoutReceiverId
) {
    public static ProfileDto from(Profile p) {
        return new ProfileDto(p.getId(), p.getDisplayName(), p.getBio(), p.getAvatarUrl(),
                p.getLocation(), p.getWebsite(), p.getInstagram(), p.getPhone(),
                p.getCoverImageUrl(), p.getFacebookUrl(), p.getTwitterUrl(), p.getTiktokUrl(),
                p.getSpecialties(), p.getYearsExperience(), p.isVerified(),
                p.getPayoutMethod(), p.getPayoutPhone(), p.getPayoutBankName(), p.getPayoutReceiverId());
    }
}
