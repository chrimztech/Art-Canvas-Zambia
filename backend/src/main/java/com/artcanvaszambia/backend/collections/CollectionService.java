package com.artcanvaszambia.backend.collections;

import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.catalog.ArtworkService;
import com.artcanvaszambia.backend.catalog.dto.ArtworkSummaryDto;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.common.SlugUtil;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Repository
interface CollectionRepository extends JpaRepository<CuratedCollection, UUID> {
    Optional<CuratedCollection> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<CuratedCollection> findAllByOrderBySortOrderAscCreatedAtDesc();

    List<CuratedCollection> findByPublishedTrueOrderBySortOrderAscCreatedAtDesc();
}

@Service
@RequiredArgsConstructor
public class CollectionService {
    private final CollectionRepository collectionRepository;
    private final ArtworkRepository artworkRepository;
    private final ArtworkService artworkService;
    private final JdbcTemplate jdbc;

    public record CollectionRequest(String title, String description, String coverImageUrl, Boolean featured,
                                    Boolean published, Integer sortOrder, List<UUID> artworkIds) {
    }

    public record CollectionSummaryDto(UUID id, String slug, String title, String description, String coverImageUrl,
                                       boolean featured, boolean published, int sortOrder, int artworkCount,
                                       List<String> previewImages, Instant createdAt) {
    }

    public record CollectionDetailDto(CollectionSummaryDto collection, List<ArtworkSummaryDto> artworks, List<UUID> artworkIds) {
    }

    /** Public listing; {@code featuredOnly} for the home page. */
    public List<CollectionSummaryDto> list(boolean featuredOnly, boolean includeUnpublished) {
        List<CuratedCollection> all = includeUnpublished
                ? collectionRepository.findAllByOrderBySortOrderAscCreatedAtDesc()
                : collectionRepository.findByPublishedTrueOrderBySortOrderAscCreatedAtDesc();
        return all.stream().filter(c -> !featuredOnly || c.isFeatured()).map(c -> summary(c, publicArtworks(c.getId()))).toList();
    }

    public CollectionDetailDto get(String slug) {
        CuratedCollection c = collectionRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Collection not found"));
        if (!c.isPublished() && !SecurityUtils.isOwnerOrAdmin(null)) {
            throw ApiException.notFound("Collection not found");
        }
        List<Artwork> artworks = publicArtworks(c.getId());
        return new CollectionDetailDto(summary(c, artworks), artworkService.toSummaries(artworks), artworkIds(c.getId()));
    }

    @Transactional
    public CollectionDetailDto save(UUID id, CollectionRequest req) {
        if (req.title() == null || req.title().isBlank()) throw ApiException.badRequest("Give the collection a title");
        CuratedCollection c = id == null ? new CuratedCollection()
                : collectionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Collection not found"));
        if (id == null) c.setSlug(SlugUtil.uniqueSlug(req.title(), collectionRepository::existsBySlug));
        c.setTitle(req.title().trim());
        c.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        c.setCoverImageUrl(req.coverImageUrl());
        c.setFeatured(Boolean.TRUE.equals(req.featured()));
        c.setPublished(req.published() == null || req.published());
        c.setSortOrder(req.sortOrder() != null ? req.sortOrder() : 0);
        collectionRepository.saveAndFlush(c);
        if (req.artworkIds() != null) {
            jdbc.update("delete from collection_artworks where collection_id = ?", c.getId());
            int pos = 0;
            for (UUID artworkId : req.artworkIds().stream().distinct().toList()) {
                if (artworkRepository.existsById(artworkId)) {
                    jdbc.update("insert into collection_artworks (collection_id, artwork_id, position) values (?, ?, ?)",
                            c.getId(), artworkId, pos++);
                }
            }
        }
        return get(c.getSlug());
    }

    @Transactional
    public void delete(UUID id) {
        collectionRepository.deleteById(id);
    }

    private List<UUID> artworkIds(UUID collectionId) {
        return jdbc.queryForList("select artwork_id from collection_artworks where collection_id = ? order by position",
                UUID.class, collectionId);
    }

    /** The collection's artworks that are visible to the public, in curated order. */
    private List<Artwork> publicArtworks(UUID collectionId) {
        List<UUID> ids = artworkIds(collectionId);
        Map<UUID, Artwork> byId = artworkRepository.findAllById(ids).stream().collect(Collectors.toMap(Artwork::getId, Function.identity()));
        return ids.stream().map(byId::get).filter(Objects::nonNull)
                .filter(a -> Artwork.PUBLISHED.equals(a.getStatus()) || Artwork.SOLD.equals(a.getStatus())).toList();
    }

    private CollectionSummaryDto summary(CuratedCollection c, List<Artwork> artworks) {
        List<String> previews = artworks.stream().map(Artwork::getCoverImageUrl).filter(Objects::nonNull).limit(4).toList();
        return new CollectionSummaryDto(c.getId(), c.getSlug(), c.getTitle(), c.getDescription(),
                c.getCoverImageUrl() != null ? c.getCoverImageUrl() : previews.stream().findFirst().orElse(null),
                c.isFeatured(), c.isPublished(), c.getSortOrder(), artworks.size(), previews, c.getCreatedAt());
    }
}
