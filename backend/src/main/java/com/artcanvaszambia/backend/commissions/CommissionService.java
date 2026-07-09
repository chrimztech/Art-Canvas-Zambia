package com.artcanvaszambia.backend.commissions;

import com.artcanvaszambia.backend.commissions.dto.CommissionClaimRequest;
import com.artcanvaszambia.backend.commissions.dto.CommissionCreateRequest;
import com.artcanvaszambia.backend.commissions.dto.CommissionDto;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.Role;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommissionService {
    private final CommissionRepository commissionRepository;
    private final ProfileRepository profileRepository;

    private static final Set<String> VALID_STATUSES = Set.of(Commission.REQUESTED, Commission.QUOTED,
            Commission.ACCEPTED, Commission.IN_PROGRESS, Commission.DELIVERED, Commission.COMPLETED, Commission.CANCELLED);

    @Transactional
    public CommissionDto create(CommissionCreateRequest req) {
        Commission c = new Commission();
        c.setCustomerId(SecurityUtils.currentUserId());
        c.setTitle(req.title());
        c.setBrief(req.brief());
        c.setBudgetZmw(req.budgetZmw());
        c.setDeadline(req.deadline());
        c.setStatus(Commission.REQUESTED);
        commissionRepository.save(c);
        return toDto(c);
    }

    public List<CommissionDto> mine() {
        return commissionRepository.findByCustomerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId())
                .stream().map(this::toDto).toList();
    }

    public List<CommissionDto> assigned() {
        return commissionRepository.findByArtistIdOrderByCreatedAtDesc(SecurityUtils.currentUserId())
                .stream().map(this::toDto).toList();
    }

    public List<CommissionDto> open() {
        return commissionRepository.findByStatusAndArtistIdIsNullOrderByCreatedAtDesc(Commission.REQUESTED)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public CommissionDto claim(UUID id, CommissionClaimRequest req) {
        var principal = SecurityUtils.currentPrincipal();
        if (!principal.hasRole(Role.ARTIST)) {
            throw ApiException.forbidden("Only artists can claim commissions");
        }
        Commission c = commissionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Commission not found"));
        if (c.getArtistId() != null) {
            throw ApiException.conflict("This commission has already been claimed");
        }
        c.setArtistId(principal.getId());
        c.setQuotedPriceZmw(req.quotedPriceZmw());
        c.setStatus(Commission.QUOTED);
        commissionRepository.save(c);
        return toDto(c);
    }

    @Transactional
    public CommissionDto updateStatus(UUID id, String status) {
        if (!VALID_STATUSES.contains(status)) {
            throw ApiException.badRequest("Invalid status");
        }
        Commission c = commissionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Commission not found"));
        UUID userId = SecurityUtils.currentUserId();
        boolean isParty = userId.equals(c.getCustomerId()) || userId.equals(c.getArtistId());
        if (!isParty && !SecurityUtils.isAdminOrAbove()) {
            throw ApiException.forbidden("Not your commission");
        }
        c.setStatus(status);
        commissionRepository.save(c);
        return toDto(c);
    }

    @Transactional
    public void delete(UUID id) {
        Commission c = commissionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Commission not found"));
        UUID userId = SecurityUtils.currentUserId();
        if (!userId.equals(c.getCustomerId())) {
            throw ApiException.forbidden("Only the customer can cancel this commission");
        }
        if (!Set.of(Commission.REQUESTED, Commission.QUOTED).contains(c.getStatus())) {
            throw ApiException.badRequest("This commission can no longer be cancelled");
        }
        commissionRepository.delete(c);
    }

    private CommissionDto toDto(Commission c) {
        String artistName = null;
        if (c.getArtistId() != null) {
            artistName = profileRepository.findById(c.getArtistId()).map(Profile::getDisplayName).orElse(null);
        }
        return new CommissionDto(c.getId(), c.getCustomerId(), c.getArtistId(), artistName, c.getTitle(),
                c.getBrief(), c.getBudgetZmw(), c.getQuotedPriceZmw(), c.getDeadline(), c.getStatus(), c.getCreatedAt());
    }
}
