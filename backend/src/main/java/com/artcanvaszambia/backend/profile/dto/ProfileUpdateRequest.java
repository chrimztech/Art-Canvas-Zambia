package com.artcanvaszambia.backend.profile.dto;

import java.util.List;

public record ProfileUpdateRequest(
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
        String payoutMethod,
        String payoutPhone,
        String payoutBankName,
        String payoutReceiverId
) {
}
