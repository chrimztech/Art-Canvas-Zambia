package com.artcanvaszambia.backend.profile.dto;

import com.artcanvaszambia.backend.profile.Profile;

import java.util.List;
import java.util.UUID;

/** What other users may see of a profile: no phone number or payout account details. */
public record PublicProfileDto(
        UUID id,
        String displayName,
        String bio,
        String avatarUrl,
        String location,
        String website,
        String instagram,
        String coverImageUrl,
        String facebookUrl,
        String twitterUrl,
        String tiktokUrl,
        List<String> specialties,
        Integer yearsExperience,
        boolean verified
) {
    public static PublicProfileDto from(Profile p) {
        return new PublicProfileDto(p.getId(), p.getDisplayName(), p.getBio(), p.getAvatarUrl(),
                p.getLocation(), p.getWebsite(), p.getInstagram(), p.getCoverImageUrl(), p.getFacebookUrl(),
                p.getTwitterUrl(), p.getTiktokUrl(), p.getSpecialties(), p.getYearsExperience(), p.isVerified());
    }
}
