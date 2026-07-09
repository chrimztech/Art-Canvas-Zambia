package com.artcanvaszambia.backend.catalog;

import com.artcanvaszambia.backend.catalog.dto.ArtworkDetailDto;
import com.artcanvaszambia.backend.catalog.dto.ArtworkRequest;
import com.artcanvaszambia.backend.catalog.dto.ArtworkSummaryDto;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.common.SlugUtil;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.Role;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArtworkService {
    private final ArtworkRepository artworkRepository;
    private final ArtworkImageRepository artworkImageRepository;
    private final ProfileRepository profileRepository;

    public List<ArtworkSummaryDto> listPublished(UUID categoryId) {
        List<Artwork> artworks = categoryId == null
                ? artworkRepository.findByStatusInOrderByCreatedAtDesc(List.of(Artwork.PUBLISHED, Artwork.SOLD))
                : artworkRepository.findByStatusAndCategoryIdOrderByCreatedAtDesc(Artwork.PUBLISHED, categoryId);
        return toSummaries(artworks);
    }

    public List<ArtworkSummaryDto> listMine() {
        UUID artistId = SecurityUtils.currentUserId();
        return toSummaries(artworkRepository.findByArtistIdOrderByCreatedAtDesc(artistId));
    }

    public List<ArtworkSummaryDto> listByArtistPublished(UUID artistId) {
        return toSummaries(artworkRepository.findByArtistIdAndStatusOrderByCreatedAtDesc(artistId, Artwork.PUBLISHED));
    }

    private List<ArtworkSummaryDto> toSummaries(List<Artwork> artworks) {
        Map<UUID, Profile> profiles = profileRepository.findByIdIn(
                        artworks.stream().map(Artwork::getArtistId).distinct().toList()).stream()
                .collect(Collectors.toMap(Profile::getId, p -> p));
        return artworks.stream().map(a -> {
            Profile p = profiles.get(a.getArtistId());
            return new ArtworkSummaryDto(a.getId(), a.getSlug(), a.getTitle(), a.getPriceZmw(), a.getCoverImageUrl(),
                    a.getMedium(), a.getArtistId(), p != null ? p.getDisplayName() : null, a.getStatus(),
                    a.getViewCount(), a.getCreatedAt());
        }).toList();
    }

    @Transactional
    public ArtworkDetailDto getBySlug(String slug) {
        Artwork a = artworkRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        a.setViewCount(a.getViewCount() + 1);
        artworkRepository.save(a);
        return toDetail(a);
    }

    public ArtworkDetailDto getByIdForOwner(UUID id) {
        Artwork a = artworkRepository.findById(id).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        SecurityUtils.requireOwnerOrAdmin(a.getArtistId());
        return toDetail(a);
    }

    private ArtworkDetailDto toDetail(Artwork a) {
        Profile p = profileRepository.findById(a.getArtistId()).orElse(null);
        List<String> images = artworkImageRepository.findByArtworkIdOrderBySortOrder(a.getId()).stream()
                .map(com.artcanvaszambia.backend.catalog.ArtworkImage::getImageUrl).toList();
        return new ArtworkDetailDto(a.getId(), a.getSlug(), a.getTitle(), a.getDescription(), a.getMedium(),
                a.getDimensions(), a.getYearCreated(), a.getPriceZmw(), a.isOriginal(), a.getEditionSize(),
                a.getStatus(), a.getCoverImageUrl(), a.getViewCount(), a.getCategoryId(), a.getArtistId(),
                p != null ? p.getDisplayName() : null, p != null ? p.getBio() : null, p != null ? p.getAvatarUrl() : null,
                images, a.getCreatedAt(), a.getMaterials(), a.getStyle(), a.getTags(), a.getWeightKg(),
                a.isFramed(), a.getProvenance(), a.isSigned(), a.getSignatureLocation(), a.isCertificateOfAuthenticity(),
                a.getSurface(), a.getOrientation(), a.getShippingNotes(), a.isReadyToHang(), a.getOriginCity(), a.getOriginCountry());
    }

    @Transactional
    public ArtworkDetailDto create(ArtworkRequest req) {
        var principal = SecurityUtils.currentPrincipal();
        if (!principal.hasRole(Role.ARTIST) && !principal.hasRole(Role.ADMIN) && !principal.hasRole(Role.SUPER_ADMIN)) {
            throw ApiException.forbidden("Only artists can list artworks");
        }
        Artwork a = new Artwork();
        a.setArtistId(principal.getId());
        applyRequest(a, req);
        a.setSlug(SlugUtil.uniqueSlug(req.title(), artworkRepository::existsBySlug));
        a.setStatus(Artwork.PUBLISHED);
        artworkRepository.save(a);
        return toDetail(a);
    }

    @Transactional
    public ArtworkDetailDto update(UUID id, ArtworkRequest req) {
        Artwork a = artworkRepository.findById(id).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        SecurityUtils.requireOwnerOrAdmin(a.getArtistId());
        applyRequest(a, req);
        artworkRepository.save(a);
        return toDetail(a);
    }

    private void applyRequest(Artwork a, ArtworkRequest req) {
        a.setTitle(req.title());
        a.setDescription(req.description());
        a.setMedium(req.medium());
        a.setDimensions(req.dimensions());
        a.setYearCreated(req.yearCreated());
        a.setPriceZmw(req.priceZmw());
        a.setOriginal(req.isOriginal() == null || req.isOriginal());
        a.setEditionSize(req.editionSize());
        a.setCategoryId(req.categoryId());
        a.setCoverImageUrl(req.coverImageUrl());
        a.setMaterials(req.materials());
        a.setStyle(req.style());
        a.setTags(req.tags() != null ? req.tags() : List.of());
        a.setWeightKg(req.weightKg());
        a.setFramed(req.framed() != null && req.framed());
        a.setProvenance(req.provenance());
        a.setSigned(req.signed() != null && req.signed());
        a.setSignatureLocation(req.signatureLocation());
        a.setCertificateOfAuthenticity(req.certificateOfAuthenticity() != null && req.certificateOfAuthenticity());
        a.setSurface(req.surface());
        a.setOrientation(req.orientation());
        a.setShippingNotes(req.shippingNotes());
        a.setReadyToHang(req.readyToHang() != null && req.readyToHang());
        a.setOriginCity(req.originCity());
        a.setOriginCountry(req.originCountry());
    }

    @Transactional
    public ArtworkSummaryDto updateStatus(UUID id, String status) {
        Artwork a = artworkRepository.findById(id).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        SecurityUtils.requireOwnerOrAdmin(a.getArtistId());
        if (!List.of(Artwork.DRAFT, Artwork.PUBLISHED, Artwork.SOLD, Artwork.ARCHIVED).contains(status)) {
            throw ApiException.badRequest("Invalid status");
        }
        a.setStatus(status);
        artworkRepository.save(a);
        return toSummaries(List.of(a)).get(0);
    }

    @Transactional
    public void delete(UUID id) {
        Artwork a = artworkRepository.findById(id).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        SecurityUtils.requireOwnerOrAdmin(a.getArtistId());
        artworkRepository.delete(a);
    }

    @Transactional
    public void addImage(UUID artworkId, String imageUrl) {
        Artwork a = artworkRepository.findById(artworkId).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        SecurityUtils.requireOwnerOrAdmin(a.getArtistId());
        int nextOrder = artworkImageRepository.findByArtworkIdOrderBySortOrder(artworkId).size();
        artworkImageRepository.save(new ArtworkImage(artworkId, imageUrl, nextOrder));
    }
}
