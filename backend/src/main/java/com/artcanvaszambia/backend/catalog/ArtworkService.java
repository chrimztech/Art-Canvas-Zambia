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
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
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
    private final CategoryRepository categoryRepository;
    private final org.springframework.context.ApplicationEventPublisher events;

    private static final List<String> PUBLIC_STATUSES = List.of(Artwork.PUBLISHED, Artwork.SOLD);

    /**
     * Public catalogue search. Matches {@code q} against title, medium, style, description
     * and the artist's display name; {@code available} hides sold work.
     */
    public List<ArtworkSummaryDto> search(String q, UUID categoryId, BigDecimal minPrice, BigDecimal maxPrice,
                                          String sort, boolean available) {
        return search(q, categoryId, minPrice, maxPrice, sort, available, null, false, false, false);
    }

    public List<ArtworkSummaryDto> search(String q, UUID categoryId, BigDecimal minPrice, BigDecimal maxPrice,
                                          String sort, boolean available, String orientation, boolean framed,
                                          boolean readyToHang, boolean freeDelivery) {
        Specification<Artwork> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(available
                    ? cb.equal(root.get("status"), Artwork.PUBLISHED)
                    : root.get("status").in(PUBLIC_STATUSES));
            if (categoryId != null) predicates.add(cb.equal(root.get("categoryId"), categoryId));
            if (minPrice != null) predicates.add(cb.greaterThanOrEqualTo(root.get("priceZmw"), minPrice));
            if (maxPrice != null) predicates.add(cb.lessThanOrEqualTo(root.get("priceZmw"), maxPrice));
            if (orientation != null && List.of("portrait", "landscape", "square").contains(orientation)) {
                predicates.add(cb.equal(root.get("orientation"), orientation));
            }
            if (framed) predicates.add(cb.isTrue(root.get("framed")));
            if (readyToHang) predicates.add(cb.isTrue(root.get("readyToHang")));
            if (freeDelivery) predicates.add(cb.equal(root.get("shippingFeeZmw"), BigDecimal.ZERO));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                Subquery<UUID> artistMatch = query.subquery(UUID.class);
                var profile = artistMatch.from(Profile.class);
                artistMatch.select(profile.get("id")).where(cb.like(cb.lower(profile.get("displayName")), like));
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("medium")), like),
                        cb.like(cb.lower(root.get("style")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        root.get("artistId").in(artistMatch)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        Sort order = switch (sort == null ? "" : sort) {
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "priceZmw");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "priceZmw");
            case "popular" -> Sort.by(Sort.Direction.DESC, "viewCount");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
        return toSummaries(artworkRepository.findAll(spec, order));
    }

    public List<ArtworkSummaryDto> listMine() {
        UUID artistId = SecurityUtils.currentUserId();
        return toSummaries(artworkRepository.findByArtistIdOrderByCreatedAtDesc(artistId));
    }

    public List<ArtworkSummaryDto> listByArtistPublished(UUID artistId) {
        return toSummaries(artworkRepository.findByArtistIdAndStatusInOrderByCreatedAtDesc(artistId, PUBLIC_STATUSES));
    }

    public List<ArtworkSummaryDto> toSummaries(List<Artwork> artworks) {
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
        boolean ownerOrAdmin = SecurityUtils.isOwnerOrAdmin(a.getArtistId());
        // Drafts and archived pieces are private to their artist (and admins).
        if (!PUBLIC_STATUSES.contains(a.getStatus()) && !ownerOrAdmin) {
            throw ApiException.notFound("Artwork not found");
        }
        if (!ownerOrAdmin) {
            a.setViewCount(a.getViewCount() + 1);
            artworkRepository.save(a);
        }
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
        String categoryName = a.getCategoryId() != null
                ? categoryRepository.findById(a.getCategoryId()).map(Category::getName).orElse(null) : null;
        return new ArtworkDetailDto(a.getId(), a.getSlug(), a.getTitle(), a.getDescription(), a.getMedium(),
                a.getDimensions(), a.getYearCreated(), a.getPriceZmw(), a.isOriginal(), a.getEditionSize(),
                a.getStatus(), a.getCoverImageUrl(), a.getViewCount(), a.getCategoryId(), a.getArtistId(),
                p != null ? p.getDisplayName() : null, p != null ? p.getBio() : null, p != null ? p.getAvatarUrl() : null,
                images, a.getCreatedAt(), a.getMaterials(), a.getStyle(), a.getTags(), a.getWeightKg(),
                a.isFramed(), a.getProvenance(), a.isSigned(), a.getSignatureLocation(), a.isCertificateOfAuthenticity(),
                a.getSurface(), a.getOrientation(), a.getShippingNotes(), a.isReadyToHang(), a.getOriginCity(), a.getOriginCountry(),
                categoryName, p != null ? p.getLocation() : null, p != null && p.isVerified(),
                a.getShippingFeeZmw(), a.isAcceptsOffers(), p != null && p.isVacationMode(),
                p != null && p.isVacationMode() ? p.getVacationMessage() : null, p != null ? p.getReturnPolicy() : null);
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
        a.setStatus(Artwork.DRAFT.equals(req.status()) ? Artwork.DRAFT : Artwork.PUBLISHED);
        artworkRepository.save(a);
        replaceImages(a.getId(), req.imageUrls());
        events.publishEvent(new ArtworkPublishedEvent(a.getId()));
        return toDetail(a);
    }

    @Transactional
    public ArtworkDetailDto update(UUID id, ArtworkRequest req) {
        Artwork a = artworkRepository.findById(id).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        SecurityUtils.requireOwnerOrAdmin(a.getArtistId());
        applyRequest(a, req);
        if (Artwork.DRAFT.equals(req.status()) || Artwork.PUBLISHED.equals(req.status())) {
            a.setStatus(req.status());
        }
        artworkRepository.save(a);
        replaceImages(a.getId(), req.imageUrls());
        events.publishEvent(new ArtworkPublishedEvent(a.getId()));
        return toDetail(a);
    }

    private void replaceImages(UUID artworkId, List<String> imageUrls) {
        if (imageUrls == null) return;
        artworkImageRepository.deleteByArtworkId(artworkId);
        int order = 0;
        for (String url : imageUrls) {
            if (url != null && !url.isBlank()) {
                artworkImageRepository.save(new ArtworkImage(artworkId, url.trim(), order++));
            }
        }
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
        if (req.shippingFeeZmw() != null && req.shippingFeeZmw().signum() < 0) {
            throw ApiException.badRequest("Delivery fee can't be negative");
        }
        a.setShippingFeeZmw(req.shippingFeeZmw() != null ? req.shippingFeeZmw() : BigDecimal.ZERO);
        a.setAcceptsOffers(req.acceptsOffers() == null || req.acceptsOffers());
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
        events.publishEvent(new ArtworkPublishedEvent(a.getId()));
        return toSummaries(List.of(a)).get(0);
    }

    public List<ArtworkSummaryDto> related(String slug) {
        Artwork a = artworkRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        Specification<Artwork> spec = (root, query, cb) -> cb.and(
                cb.equal(root.get("status"), Artwork.PUBLISHED),
                cb.notEqual(root.get("id"), a.getId()),
                a.getCategoryId() != null
                        ? cb.or(cb.equal(root.get("categoryId"), a.getCategoryId()), cb.equal(root.get("artistId"), a.getArtistId()))
                        : cb.equal(root.get("artistId"), a.getArtistId()));
        List<Artwork> found = artworkRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "viewCount"));
        return toSummaries(found.stream().limit(8).toList());
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
