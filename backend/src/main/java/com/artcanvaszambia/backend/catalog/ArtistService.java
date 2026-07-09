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

    public List<ArtistSummaryDto> list() {
        List<UUID> artistIds = userRoleRepository.findByRole(Role.ARTIST).stream()
                .map(UserRoleEntity::getUserId).toList();
        List<Profile> profiles = profileRepository.findByIdIn(artistIds);
        return profiles.stream().map(p -> new ArtistSummaryDto(
                p.getId(), p.getDisplayName(), p.getAvatarUrl(), p.getBio(), p.getLocation(),
                artworkRepository.countByArtistIdAndStatus(p.getId(), Artwork.PUBLISHED)
        )).toList();
    }

    public ArtistDetailDto get(UUID id) {
        Profile p = profileRepository.findById(id).orElseThrow(() -> ApiException.notFound("Artist not found"));
        return new ArtistDetailDto(p.getId(), p.getDisplayName(), p.getAvatarUrl(), p.getBio(), p.getLocation(),
                p.getWebsite(), p.getInstagram(), artworkService.listByArtistPublished(id));
    }
}
