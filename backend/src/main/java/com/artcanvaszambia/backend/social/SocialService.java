package com.artcanvaszambia.backend.social;

import com.artcanvaszambia.backend.auth.UserRoleRepository;
import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.catalog.ArtworkService;
import com.artcanvaszambia.backend.catalog.dto.ArtworkSummaryDto;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.AppUserPrincipal;
import com.artcanvaszambia.backend.security.Role;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Following artists, saved-search alerts, and the one-time "new work" fan-out when an artwork is published. */
@Service
@RequiredArgsConstructor
public class SocialService {
    private static final int MAX_SAVED_SEARCHES = 20;

    private final FollowRepository followRepository;
    private final SavedSearchRepository savedSearchRepository;
    private final UserRoleRepository userRoleRepository;
    private final ArtworkRepository artworkRepository;
    private final ArtworkService artworkService;
    private final ProfileRepository profileRepository;
    private final NotificationService notificationService;

    public record FollowedArtistDto(UUID id, String displayName, String avatarUrl, String location, Instant followedAt) {
    }

    public record SavedSearchDto(UUID id, String name, String query, UUID categoryId, BigDecimal minPriceZmw,
                                 BigDecimal maxPriceZmw, Instant createdAt) {
    }

    public record SavedSearchRequest(String name, String query, UUID categoryId, BigDecimal minPriceZmw, BigDecimal maxPriceZmw) {
    }

    // ---------- follows

    @Transactional
    public void follow(UUID artistId) {
        UUID me = SecurityUtils.currentUserId();
        if (me.equals(artistId)) throw ApiException.badRequest("You can't follow yourself");
        if (!userRoleRepository.existsByUserIdAndRole(artistId, Role.ARTIST)) {
            throw ApiException.notFound("Artist not found");
        }
        if (!followRepository.existsByFollowerIdAndArtistId(me, artistId)) {
            followRepository.save(new Follow(me, artistId));
        }
    }

    @Transactional
    public void unfollow(UUID artistId) {
        followRepository.deleteByFollowerIdAndArtistId(SecurityUtils.currentUserId(), artistId);
    }

    public long followerCount(UUID artistId) {
        return followRepository.countByArtistId(artistId);
    }

    /** Whether the current (possibly anonymous) viewer follows the artist. */
    public boolean viewerFollows(UUID artistId) {
        AppUserPrincipal viewer = SecurityUtils.currentPrincipalOrNull();
        return viewer != null && followRepository.existsByFollowerIdAndArtistId(viewer.getId(), artistId);
    }

    public List<FollowedArtistDto> following() {
        List<Follow> follows = followRepository.findByFollowerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId());
        var profiles = profileRepository.findByIdIn(follows.stream().map(Follow::getArtistId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(Profile::getId, p -> p));
        return follows.stream().map(f -> {
            Profile p = profiles.get(f.getArtistId());
            return new FollowedArtistDto(f.getArtistId(), p != null ? p.getDisplayName() : null,
                    p != null ? p.getAvatarUrl() : null, p != null ? p.getLocation() : null, f.getCreatedAt());
        }).toList();
    }

    /** Newest available work from the artists the viewer follows. */
    public List<ArtworkSummaryDto> feed() {
        List<UUID> artistIds = followRepository.findByFollowerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId())
                .stream().map(Follow::getArtistId).toList();
        if (artistIds.isEmpty()) return List.of();
        List<Artwork> works = artistIds.stream()
                .flatMap(id -> artworkRepository.findByArtistIdAndStatusOrderByCreatedAtDesc(id, Artwork.PUBLISHED).stream())
                .sorted(Comparator.comparing(Artwork::getCreatedAt).reversed())
                .limit(60)
                .toList();
        return artworkService.toSummaries(works);
    }

    // ---------- saved searches

    public List<SavedSearchDto> savedSearches() {
        return savedSearchRepository.findByUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()).stream()
                .map(this::toDto).toList();
    }

    @Transactional
    public SavedSearchDto saveSearch(SavedSearchRequest req) {
        UUID me = SecurityUtils.currentUserId();
        if (savedSearchRepository.countByUserId(me) >= MAX_SAVED_SEARCHES) {
            throw ApiException.badRequest("You can keep up to " + MAX_SAVED_SEARCHES + " alerts. Delete one to add another.");
        }
        boolean hasCriteria = (req.query() != null && !req.query().isBlank()) || req.categoryId() != null
                || req.minPriceZmw() != null || req.maxPriceZmw() != null;
        if (!hasCriteria) {
            throw ApiException.badRequest("Add a search term, category or price range to create an alert");
        }
        SavedSearch s = new SavedSearch();
        s.setUserId(me);
        s.setName(req.name() != null && !req.name().isBlank() ? req.name().trim() : describe(req));
        s.setQuery(req.query() != null && !req.query().isBlank() ? req.query().trim() : null);
        s.setCategoryId(req.categoryId());
        s.setMinPriceZmw(req.minPriceZmw());
        s.setMaxPriceZmw(req.maxPriceZmw());
        return toDto(savedSearchRepository.save(s));
    }

    @Transactional
    public void deleteSearch(UUID id) {
        SavedSearch s = savedSearchRepository.findById(id)
                .filter(x -> x.getUserId().equals(SecurityUtils.currentUserId()))
                .orElseThrow(() -> ApiException.notFound("Alert not found"));
        savedSearchRepository.delete(s);
    }

    // ---------- fan-out

    @org.springframework.context.event.EventListener
    public void onArtworkPublished(com.artcanvaszambia.backend.catalog.ArtworkPublishedEvent event) {
        artworkRepository.findById(event.artworkId()).ifPresent(this::announceIfNew);
    }

    /**
     * Tells followers and matching saved searches about a newly published artwork, once per artwork
     * (re-publishing after a draft round-trip doesn't re-notify).
     */
    @Transactional
    public void announceIfNew(Artwork a) {
        if (!Artwork.PUBLISHED.equals(a.getStatus()) || a.getAnnouncedAt() != null) return;
        a.setAnnouncedAt(Instant.now());
        artworkRepository.save(a);

        Set<UUID> notified = new HashSet<>();
        notified.add(a.getArtistId());
        for (Follow f : followRepository.findByArtistId(a.getArtistId())) {
            if (notified.add(f.getFollowerId())) {
                notificationService.newWorkFromFollowedArtist(f.getFollowerId(), a.getArtistId(), a.getTitle(), a.getSlug());
            }
        }
        String artistName = profileRepository.findById(a.getArtistId()).map(Profile::getDisplayName).orElse("");
        for (SavedSearch s : savedSearchRepository.findAll()) {
            if (!notified.contains(s.getUserId()) && matches(s, a, artistName)) {
                notified.add(s.getUserId());
                notificationService.savedSearchMatch(s.getUserId(), s.getName(), a.getTitle(), a.getSlug());
            }
        }
    }

    static boolean matches(SavedSearch s, Artwork a, String artistName) {
        if (s.getCategoryId() != null && !s.getCategoryId().equals(a.getCategoryId())) return false;
        if (s.getMinPriceZmw() != null && a.getPriceZmw().compareTo(s.getMinPriceZmw()) < 0) return false;
        if (s.getMaxPriceZmw() != null && a.getPriceZmw().compareTo(s.getMaxPriceZmw()) > 0) return false;
        if (s.getQuery() != null) {
            String q = s.getQuery().toLowerCase(Locale.ROOT);
            String haystack = String.join(" ", nz(a.getTitle()), nz(a.getMedium()), nz(a.getStyle()), nz(a.getDescription()),
                    nz(artistName), a.getTags() != null ? String.join(" ", a.getTags()) : "").toLowerCase(Locale.ROOT);
            return haystack.contains(q);
        }
        return true;
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static String describe(SavedSearchRequest r) {
        StringBuilder sb = new StringBuilder(r.query() != null && !r.query().isBlank() ? r.query().trim() : "New art");
        if (r.minPriceZmw() != null || r.maxPriceZmw() != null) {
            sb.append(" · K").append(r.minPriceZmw() != null ? r.minPriceZmw().toPlainString() : "0")
                    .append("–").append(r.maxPriceZmw() != null ? "K" + r.maxPriceZmw().toPlainString() : "any");
        }
        return sb.toString();
    }

    private SavedSearchDto toDto(SavedSearch s) {
        return new SavedSearchDto(s.getId(), s.getName(), s.getQuery(), s.getCategoryId(), s.getMinPriceZmw(),
                s.getMaxPriceZmw(), s.getCreatedAt());
    }
}
