package com.artcanvaszambia.backend.commissions;

import com.artcanvaszambia.backend.auth.UserRoleRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Commission lifecycle:
 * requested -> quoted (artist sends a price) -> accepted (customer pays the quote at checkout)
 * -> in_progress -> delivered (artist) -> completed (customer). Either side may cancel before payment.
 */
@Service
@RequiredArgsConstructor
public class CommissionService {
    private final CommissionRepository commissionRepository;
    private final ProfileRepository profileRepository;
    private final UserRoleRepository userRoleRepository;
    private final com.artcanvaszambia.backend.notifications.NotificationService notificationService;

    @Transactional
    public CommissionDto create(CommissionCreateRequest req) {
        UUID customerId = SecurityUtils.currentUserId();
        if (req.budgetZmw() != null && req.budgetZmw().signum() < 0) {
            throw ApiException.badRequest("Budget can't be negative");
        }
        if (req.deadline() != null && req.deadline().isBefore(LocalDate.now())) {
            throw ApiException.badRequest("The deadline can't be in the past");
        }
        Commission c = new Commission();
        c.setCustomerId(customerId);
        c.setTitle(req.title());
        c.setBrief(req.brief());
        c.setBudgetZmw(req.budgetZmw());
        c.setDeadline(req.deadline());
        c.setReferenceImageUrls(req.referenceImageUrls() != null
                ? req.referenceImageUrls().stream().filter(u -> u != null && !u.isBlank()).toList()
                : List.of());
        if (req.artistId() != null) {
            if (req.artistId().equals(customerId)) {
                throw ApiException.badRequest("You can't commission yourself");
            }
            if (!userRoleRepository.existsByUserIdAndRole(req.artistId(), Role.ARTIST)) {
                throw ApiException.badRequest("That artist isn't accepting commissions");
            }
            c.setArtistId(req.artistId());
        }
        c.setStatus(Commission.REQUESTED);
        commissionRepository.save(c);
        notificationService.commissionRequested(c);
        return toDtos(List.of(c)).get(0);
    }

    public List<CommissionDto> mine() {
        return toDtos(commissionRepository.findByCustomerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()));
    }

    public List<CommissionDto> assigned() {
        return toDtos(commissionRepository.findByArtistIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()));
    }

    public List<CommissionDto> open() {
        UUID me = SecurityUtils.currentUserId();
        return toDtos(commissionRepository.findByStatusAndArtistIdIsNullOrderByCreatedAtDesc(Commission.REQUESTED)
                .stream().filter(c -> !c.getCustomerId().equals(me)).toList());
    }

    /** An artist claims an open brief by sending a quote. */
    @Transactional
    public CommissionDto claim(UUID id, CommissionClaimRequest req) {
        var principal = SecurityUtils.currentPrincipal();
        if (!principal.hasRole(Role.ARTIST)) {
            throw ApiException.forbidden("Only artists can claim commissions");
        }
        Commission c = commissionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Commission not found"));
        if (c.getCustomerId().equals(principal.getId())) {
            throw ApiException.badRequest("You can't claim your own request");
        }
        if (c.getArtistId() != null || !Commission.REQUESTED.equals(c.getStatus())) {
            throw ApiException.conflict("This commission has already been claimed");
        }
        c.setArtistId(principal.getId());
        applyQuote(c, req);
        commissionRepository.save(c);
        notificationService.commissionQuoted(c);
        return toDtos(List.of(c)).get(0);
    }

    /** The assigned artist sends (or revises) a quote on a direct request. */
    @Transactional
    public CommissionDto quote(UUID id, CommissionClaimRequest req) {
        Commission c = commissionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Commission not found"));
        if (!SecurityUtils.currentUserId().equals(c.getArtistId())) {
            throw ApiException.forbidden("Only the assigned artist can quote this commission");
        }
        if (!Commission.REQUESTED.equals(c.getStatus()) && !Commission.QUOTED.equals(c.getStatus())) {
            throw ApiException.badRequest("This commission can no longer be re-quoted");
        }
        applyQuote(c, req);
        commissionRepository.save(c);
        notificationService.commissionQuoted(c);
        return toDtos(List.of(c)).get(0);
    }

    /** The assigned artist passes on a brief; it goes back into the open pool for other artists. */
    @Transactional
    public CommissionDto release(UUID id) {
        Commission c = commissionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Commission not found"));
        if (!SecurityUtils.currentUserId().equals(c.getArtistId())) {
            throw ApiException.forbidden("Not your commission");
        }
        if (!Commission.REQUESTED.equals(c.getStatus()) && !Commission.QUOTED.equals(c.getStatus())) {
            throw ApiException.badRequest("This commission has already been paid for");
        }
        c.setArtistId(null);
        c.setQuotedPriceZmw(null);
        c.setArtistNote(null);
        c.setStatus(Commission.REQUESTED);
        commissionRepository.save(c);
        return toDtos(List.of(c)).get(0);
    }

    private void applyQuote(Commission c, CommissionClaimRequest req) {
        BigDecimal price = req != null ? req.quotedPriceZmw() : null;
        if (price == null || price.signum() <= 0) {
            throw ApiException.badRequest("Please enter a quote greater than zero");
        }
        c.setQuotedPriceZmw(price);
        c.setArtistNote(req.note() != null && !req.note().isBlank() ? req.note().trim() : null);
        c.setStatus(Commission.QUOTED);
    }

    /**
     * Party-driven status changes. Payment (quoted -> accepted) happens only through checkout,
     * so it is deliberately not reachable from here.
     */
    @Transactional
    public CommissionDto updateStatus(UUID id, String status) {
        Commission c = commissionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Commission not found"));
        UUID userId = SecurityUtils.currentUserId();
        boolean isCustomer = userId.equals(c.getCustomerId());
        boolean isArtist = userId.equals(c.getArtistId());
        String from = c.getStatus();

        boolean allowed =
                (isArtist && Commission.ACCEPTED.equals(from) && Commission.IN_PROGRESS.equals(status))
                || (isArtist && Commission.IN_PROGRESS.equals(from) && Commission.DELIVERED.equals(status))
                || (isCustomer && Commission.DELIVERED.equals(from) && Commission.COMPLETED.equals(status))
                || (isCustomer && Set.of(Commission.REQUESTED, Commission.QUOTED).contains(from)
                        && Commission.CANCELLED.equals(status));
        if (!isCustomer && !isArtist) {
            throw ApiException.forbidden("Not your commission");
        }
        if (!allowed) {
            throw ApiException.badRequest("You can't move this commission from " + from.replace('_', ' ')
                    + " to " + status.replace('_', ' '));
        }
        c.setStatus(status);
        commissionRepository.save(c);
        notificationService.commissionStatus(c);
        return toDtos(List.of(c)).get(0);
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

    private List<CommissionDto> toDtos(List<Commission> commissions) {
        Map<UUID, Profile> profiles = profileRepository.findByIdIn(commissions.stream()
                        .flatMap(c -> java.util.stream.Stream.of(c.getCustomerId(), c.getArtistId()))
                        .filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Profile::getId, Function.identity()));
        return commissions.stream().map(c -> {
            Profile artist = c.getArtistId() != null ? profiles.get(c.getArtistId()) : null;
            Profile customer = profiles.get(c.getCustomerId());
            return new CommissionDto(c.getId(), c.getCustomerId(), c.getArtistId(),
                    artist != null ? artist.getDisplayName() : null, c.getTitle(), c.getBrief(), c.getBudgetZmw(),
                    c.getQuotedPriceZmw(), c.getDeadline(), c.getStatus(), c.getCreatedAt(),
                    customer != null ? customer.getDisplayName() : null, c.getArtistNote(),
                    c.getReferenceImageUrls() != null ? c.getReferenceImageUrls() : List.of());
        }).toList();
    }
}
