package com.artcanvaszambia.backend.supplies;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.common.SlugUtil;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.supplies.dto.SupplyDetailDto;
import com.artcanvaszambia.backend.supplies.dto.SupplyRequest;
import com.artcanvaszambia.backend.supplies.dto.SupplySummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplyService {
    private final SupplyRepository supplyRepository;
    private final SupplyImageRepository supplyImageRepository;
    private final ProfileRepository profileRepository;

    public List<SupplySummaryDto> listPublished() {
        return supplyRepository.findByStatusOrderByCreatedAtDesc(Supply.PUBLISHED).stream().map(this::toSummary).toList();
    }

    public List<SupplySummaryDto> mine() {
        return supplyRepository.findBySellerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId())
                .stream().map(this::toSummary).toList();
    }

    public SupplyDetailDto getBySlug(String slug) {
        Supply s = supplyRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Supply not found"));
        return toDetail(s);
    }

    @Transactional
    public SupplyDetailDto create(SupplyRequest req) {
        Supply s = new Supply();
        s.setSellerId(SecurityUtils.currentUserId());
        applyRequest(s, req);
        s.setSlug(SlugUtil.uniqueSlug(req.name(), supplyRepository::existsBySlug));
        s.setStatus(Supply.PUBLISHED);
        supplyRepository.save(s);
        return toDetail(s);
    }

    @Transactional
    public SupplyDetailDto update(UUID id, SupplyRequest req) {
        Supply s = supplyRepository.findById(id).orElseThrow(() -> ApiException.notFound("Supply not found"));
        SecurityUtils.requireOwnerOrAdmin(s.getSellerId());
        applyRequest(s, req);
        supplyRepository.save(s);
        return toDetail(s);
    }

    @Transactional
    public void delete(UUID id) {
        Supply s = supplyRepository.findById(id).orElseThrow(() -> ApiException.notFound("Supply not found"));
        SecurityUtils.requireOwnerOrAdmin(s.getSellerId());
        supplyRepository.delete(s);
    }

    @Transactional
    public void addImage(UUID supplyId, String imageUrl) {
        Supply s = supplyRepository.findById(supplyId).orElseThrow(() -> ApiException.notFound("Supply not found"));
        SecurityUtils.requireOwnerOrAdmin(s.getSellerId());
        int nextOrder = supplyImageRepository.findBySupplyIdOrderBySortOrder(supplyId).size();
        supplyImageRepository.save(new SupplyImage(supplyId, imageUrl, nextOrder));
    }

    private void applyRequest(Supply s, SupplyRequest req) {
        s.setName(req.name());
        s.setDescription(req.description());
        s.setCategory(req.category());
        s.setCondition(req.condition() != null ? req.condition() : "new");
        s.setPriceZmw(req.priceZmw());
        s.setStock(req.stock() != null ? req.stock() : 0);
        s.setCoverImageUrl(req.coverImageUrl());
        s.setBrand(req.brand());
        s.setSku(req.sku());
        s.setDimensions(req.dimensions());
        s.setWeightKg(req.weightKg());
        s.setWarrantyMonths(req.warrantyMonths());
        s.setTags(req.tags() != null ? req.tags() : List.of());
    }

    private SupplySummaryDto toSummary(Supply s) {
        return new SupplySummaryDto(s.getId(), s.getSlug(), s.getName(), s.getPriceZmw(), s.getCoverImageUrl(),
                s.getCategory(), s.getCondition(), s.getStock(), s.getStatus(), s.getBrand());
    }

    private SupplyDetailDto toDetail(Supply s) {
        Profile p = profileRepository.findById(s.getSellerId()).orElse(null);
        List<String> images = supplyImageRepository.findBySupplyIdOrderBySortOrder(s.getId()).stream()
                .map(SupplyImage::getImageUrl).toList();
        return new SupplyDetailDto(s.getId(), s.getSlug(), s.getName(), s.getDescription(), s.getCategory(),
                s.getCondition(), s.getPriceZmw(), s.getStock(), s.getCoverImageUrl(), s.getStatus(), s.getSellerId(),
                p != null ? p.getDisplayName() : null, p != null ? p.getLocation() : null, p != null ? p.getPhone() : null,
                s.getBrand(), s.getSku(), s.getDimensions(), s.getWeightKg(), s.getWarrantyMonths(), s.getTags(), images);
    }
}
