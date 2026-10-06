package com.artcanvaszambia.backend.catalog;

import com.artcanvaszambia.backend.auth.UserRoleEntity;
import com.artcanvaszambia.backend.auth.UserRoleRepository;
import com.artcanvaszambia.backend.catalog.dto.ArtistDetailDto;
import com.artcanvaszambia.backend.catalog.dto.ArtistSummaryDto;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ArtistService {
    private final UserRoleRepository userRoleRepository;
    private final ProfileRepository profileRepository;
    private final ArtworkRepository artworkRepository;
    private final ArtworkService artworkService;
    private final com.artcanvaszambia.backend.reviews.ReviewService reviewService;

    public List<ArtistSummaryDto> list() {
        List<UUID> artistIds = userRoleRepository.findByRole(Role.ARTIST).stream()
                .map(UserRoleEntity::getUserId).toList();
        List<Profile> profiles = profileRepository.findByIdIn(artistIds);
        var ratings = reviewService.ratingsFor(artistIds);
        return profiles.stream().map(p -> new ArtistSummaryDto(
                p.getId(), p.getDisplayName(), p.getAvatarUrl(), p.getBio(), p.getLocation(),
                artworkRepository.countByArtistIdAndStatus(p.getId(), Artwork.PUBLISHED),
                p.isVerified(),
                ratings.containsKey(p.getId()) ? ratings.get(p.getId()).average() : 0,
                ratings.containsKey(p.getId()) ? ratings.get(p.getId()).count() : 0
        )).toList();
    }

    public ArtistDetailDto get(UUID id) {
        Profile p = profileRepository.findById(id).orElseThrow(() -> ApiException.notFound("Artist not found"));
        var rating = reviewService.ratingsFor(java.util.List.of(id)).get(id);
        return new ArtistDetailDto(p.getId(), p.getDisplayName(), p.getAvatarUrl(), p.getBio(), p.getLocation(),
                p.getWebsite(), p.getInstagram(), artworkService.listByArtistPublished(id),
                p.getCoverImageUrl(), p.getFacebookUrl(), p.getTwitterUrl(), p.getTiktokUrl(),
                p.getSpecialties(), p.getYearsExperience(), p.isVerified(),
                rating != null ? rating.average() : 0, rating != null ? rating.count() : 0);
    }
}
