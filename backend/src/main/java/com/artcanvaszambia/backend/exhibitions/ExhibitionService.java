package com.artcanvaszambia.backend.exhibitions;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.common.QrCodeUtil;
import com.artcanvaszambia.backend.common.SlugUtil;
import com.artcanvaszambia.backend.common.dto.AttendeeDto;
import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.orders.CheckoutService;
import com.artcanvaszambia.backend.security.Role;
import com.artcanvaszambia.backend.exhibitions.dto.ExhibitionDto;
import com.artcanvaszambia.backend.exhibitions.dto.ExhibitionRequest;
import com.artcanvaszambia.backend.exhibitions.dto.TicketDto;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExhibitionService {
    private final ExhibitionRepository exhibitionRepository;
    private final ExhibitionTicketRepository ticketRepository;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final CheckoutService checkoutService;
    private final com.artcanvaszambia.backend.waitlist.WaitlistService waitlistService;

    private static final Set<String> OWNER_STATUSES = Set.of(Exhibition.DRAFT, Exhibition.PUBLISHED,
            Exhibition.CANCELLED, Exhibition.COMPLETED);

    public List<ExhibitionDto> listPublished() {
        return exhibitionRepository.findByStatusOrderByStartsAt(Exhibition.PUBLISHED).stream().map(this::toDto).toList();
    }

    public List<ExhibitionDto> mine() {
        return exhibitionRepository.findByOrganizerIdOrderByStartsAtDesc(SecurityUtils.currentUserId())
                .stream().map(this::toDto).toList();
    }

    public ExhibitionDto getBySlug(String slug) {
        Exhibition e = exhibitionRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        if (Exhibition.DRAFT.equals(e.getStatus()) && !SecurityUtils.isOwnerOrAdmin(e.getOrganizerId())) {
            throw ApiException.notFound("Exhibition not found");
        }
        return toDto(e);
    }

    @Transactional
    public ExhibitionDto create(ExhibitionRequest req) {
        SecurityUtils.requireAnyRole("Enable artist or instructor tools from your dashboard to host exhibitions",
                Role.ARTIST, Role.INSTRUCTOR);
        var principal = SecurityUtils.currentPrincipal();
        Exhibition e = new Exhibition();
        e.setOrganizerId(principal.getId());
        applyRequest(e, req);
        e.setSlug(SlugUtil.uniqueSlug(req.title(), exhibitionRepository::existsBySlug));
        e.setStatus(Exhibition.PUBLISHED);
        exhibitionRepository.save(e);
        return toDto(e);
    }

    private void applyRequest(Exhibition e, ExhibitionRequest req) {
        if (!req.endsAt().isAfter(req.startsAt())) {
            throw ApiException.badRequest("The exhibition must end after it starts");
        }
        if (req.capacity() != null && req.capacity() < 1) {
            throw ApiException.badRequest("Capacity must be at least 1");
        }
        if (req.ticketPriceZmw() != null && req.ticketPriceZmw().signum() < 0) {
            throw ApiException.badRequest("Ticket price can't be negative");
        }
        e.setTitle(req.title());
        e.setDescription(req.description());
        e.setCoverImageUrl(req.coverImageUrl());
        e.setVenue(req.venue());
        e.setCity(req.city());
        e.setStartsAt(req.startsAt());
        e.setEndsAt(req.endsAt());
        e.setTicketPriceZmw(req.ticketPriceZmw() != null ? req.ticketPriceZmw() : BigDecimal.ZERO);
        e.setCapacity(req.capacity());
        e.setCuratorName(req.curatorName());
        e.setTheme(req.theme());
        e.setTags(req.tags() != null ? req.tags() : List.of());
        e.setContactEmail(req.contactEmail());
        e.setContactPhone(req.contactPhone());
        // Featuring is an editorial decision: only admins can set it, and organiser edits keep it as-is.
        if (SecurityUtils.isAdminOrAbove()) {
            e.setFeatured(req.isFeatured() != null && req.isFeatured());
        }
    }

    @Transactional
    public ExhibitionDto update(UUID id, ExhibitionRequest req) {
        Exhibition e = exhibitionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        SecurityUtils.requireOwnerOrAdmin(e.getOrganizerId());
        applyRequest(e, req);
        exhibitionRepository.save(e);
        waitlistService.placesMayHaveOpened(com.artcanvaszambia.backend.waitlist.WaitlistService.EXHIBITION, e.getId());
        return toDto(e);
    }

    @Transactional
    public ExhibitionDto updateStatus(UUID id, String status) {
        Exhibition e = exhibitionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        SecurityUtils.requireOwnerOrAdmin(e.getOrganizerId());
        String normalized = status == null ? "" : status.trim().toLowerCase();
        if (!OWNER_STATUSES.contains(normalized)) {
            throw ApiException.badRequest("Invalid exhibition status");
        }
        e.setStatus(normalized);
        exhibitionRepository.save(e);
        return toDto(e);
    }

    @Transactional
    public void delete(UUID id) {
        Exhibition e = exhibitionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        SecurityUtils.requireOwnerOrAdmin(e.getOrganizerId());
        if (ticketRepository.sumQuantityByExhibitionIdAndStatusIn(id, CheckoutService.SEAT_HOLDING_STATUSES) > 0) {
            throw ApiException.conflict("Tickets have been issued for this exhibition. Cancel it instead of deleting it.");
        }
        exhibitionRepository.delete(e);
    }

    /** The organiser's guest list, used for door check-in. */
    public List<AttendeeDto> attendees(UUID exhibitionId) {
        Exhibition e = exhibitionRepository.findById(exhibitionId)
                .orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        SecurityUtils.requireOwnerOrAdmin(e.getOrganizerId());
        List<ExhibitionTicket> tickets = ticketRepository.findByExhibitionIdOrderByCreatedAtAsc(exhibitionId);
        List<UUID> buyerIds = tickets.stream().map(ExhibitionTicket::getBuyerId).distinct().toList();
        Map<UUID, Profile> profiles = profileRepository.findByIdIn(buyerIds).stream()
                .collect(Collectors.toMap(Profile::getId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(buyerIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return tickets.stream().map(t -> {
            Profile p = profiles.get(t.getBuyerId());
            User u = users.get(t.getBuyerId());
            return new AttendeeDto(t.getId(), t.getBuyerId(), p != null ? p.getDisplayName() : null,
                    u != null ? u.getEmail() : null, t.getStatus(), t.getQuantity(), t.getTotalZmw(),
                    t.getCreatedAt(), t.getCheckedInAt());
        }).toList();
    }

    public List<TicketDto> myTickets() {
        UUID buyerId = SecurityUtils.currentUserId();
        List<ExhibitionTicket> tickets = ticketRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId);
        Map<UUID, Exhibition> exhibitions = exhibitionRepository.findAllById(
                        tickets.stream().map(ExhibitionTicket::getExhibitionId).distinct().toList()).stream()
                .collect(Collectors.toMap(Exhibition::getId, ex -> ex));
        return tickets.stream().map(t -> {
            Exhibition ex = exhibitions.get(t.getExhibitionId());
            return new TicketDto(t.getId(), t.getExhibitionId(), ex != null ? ex.getTitle() : null,
                    ex != null ? ex.getSlug() : null, ex != null ? ex.getCoverImageUrl() : null,
                    ex != null ? ex.getStartsAt() : null, ex != null ? ex.getEndsAt() : null,
                    t.getQuantity(), t.getTotalZmw(), t.getStatus(), t.getCreatedAt(), t.getQrCode(), t.getCheckedInAt());
        }).toList();
    }

    @Transactional
    public TicketDto checkInTicket(UUID ticketId) {
        ExhibitionTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> ApiException.notFound("Ticket not found"));
        Exhibition e = exhibitionRepository.findById(ticket.getExhibitionId())
                .orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        SecurityUtils.requireOwnerOrAdmin(e.getOrganizerId());
        if (!"paid".equals(ticket.getStatus())) {
            throw ApiException.badRequest("This ticket hasn't been paid for");
        }
        if (ticket.getCheckedInAt() != null) {
            throw ApiException.conflict("This ticket has already been checked in");
        }
        ticket.setCheckedInAt(java.time.Instant.now());
        ticketRepository.save(ticket);
        return new TicketDto(ticket.getId(), ticket.getExhibitionId(), e.getTitle(), e.getSlug(), e.getCoverImageUrl(),
                e.getStartsAt(), e.getEndsAt(), ticket.getQuantity(), ticket.getTotalZmw(), ticket.getStatus(),
                ticket.getCreatedAt(), ticket.getQrCode(), ticket.getCheckedInAt());
    }

    /** Free exhibitions issue a confirmed, QR-coded ticket straight away; paid ones go through checkout. */
    @Transactional
    public void bookTicket(UUID exhibitionId, int quantity) {
        UUID buyerId = SecurityUtils.currentUserId();
        Exhibition e = exhibitionRepository.findById(exhibitionId)
                .orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        if (e.getTicketPriceZmw() != null && e.getTicketPriceZmw().signum() > 0) {
            throw ApiException.badRequest("Tickets for this exhibition must be paid for at checkout");
        }
        if (quantity < 1 || quantity > 20) {
            throw ApiException.badRequest("Quantity must be between 1 and 20");
        }
        checkoutService.requireExhibitionBookable(e, quantity);
        ExhibitionTicket ticket = new ExhibitionTicket();
        ticket.setExhibitionId(exhibitionId);
        ticket.setBuyerId(buyerId);
        ticket.setQuantity(quantity);
        ticket.setTotalZmw(BigDecimal.ZERO);
        ticket.setStatus("paid");
        ticket = ticketRepository.save(ticket);
        ticket.setQrCode(QrCodeUtil.generateDataUri(ticket.getId().toString()));
        ticketRepository.save(ticket);
    }

    private ExhibitionDto toDto(Exhibition e) {
        Profile p = profileRepository.findById(e.getOrganizerId()).orElse(null);
        return new ExhibitionDto(e.getId(), e.getSlug(), e.getTitle(), e.getDescription(), e.getCoverImageUrl(),
                e.getVenue(), e.getCity(), e.getStartsAt(), e.getEndsAt(), e.getTicketPriceZmw(), e.getCapacity(),
                e.getStatus(), e.getOrganizerId(), p != null ? p.getDisplayName() : null,
                e.getCuratorName(), e.getTheme(), e.getTags(), e.getContactEmail(), e.getContactPhone(), e.isFeatured(),
                ticketRepository.sumQuantityByExhibitionIdAndStatusIn(e.getId(), CheckoutService.SEAT_HOLDING_STATUSES));
    }
}
