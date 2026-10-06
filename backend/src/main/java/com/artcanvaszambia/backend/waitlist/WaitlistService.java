package com.artcanvaszambia.backend.waitlist;

import com.artcanvaszambia.backend.classes.ClassEnrollmentRepository;
import com.artcanvaszambia.backend.classes.ClassEntity;
import com.artcanvaszambia.backend.classes.ClassRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.exhibitions.Exhibition;
import com.artcanvaszambia.backend.exhibitions.ExhibitionRepository;
import com.artcanvaszambia.backend.exhibitions.ExhibitionTicketRepository;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.orders.CheckoutService;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Waitlists for full classes and exhibitions. When places open up (refund, cancellation or a
 * capacity increase) the earliest waiting people are notified — one notification per free place.
 */
@Service
@RequiredArgsConstructor
public class WaitlistService {
    public static final String CLASS = "CLASS";
    public static final String EXHIBITION = "EXHIBITION";

    private final WaitlistRepository waitlistRepository;
    private final ClassRepository classRepository;
    private final ClassEnrollmentRepository enrollmentRepository;
    private final ExhibitionRepository exhibitionRepository;
    private final ExhibitionTicketRepository ticketRepository;
    private final NotificationService notificationService;

    public record WaitlistDto(UUID id, String itemType, UUID itemId, String title, String path, Instant notifiedAt, Instant createdAt) {
    }

    @Transactional
    public void join(String itemType, UUID itemId) {
        UUID me = SecurityUtils.currentUserId();
        String type = normalize(itemType);
        if (freePlaces(type, itemId) > 0) {
            throw ApiException.badRequest("Places are still available — you can book now");
        }
        if (waitlistRepository.findByUserIdAndItemTypeAndItemId(me, type, itemId).isEmpty()) {
            WaitlistEntry e = new WaitlistEntry();
            e.setUserId(me);
            e.setItemType(type);
            e.setItemId(itemId);
            waitlistRepository.save(e);
        }
    }

    @Transactional
    public void leave(String itemType, UUID itemId) {
        waitlistRepository.deleteByUserIdAndItemTypeAndItemId(SecurityUtils.currentUserId(), normalize(itemType), itemId);
    }

    public List<WaitlistDto> mine() {
        return waitlistRepository.findByUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()).stream()
                .map(e -> {
                    String[] tp = titleAndPath(e.getItemType(), e.getItemId());
                    return new WaitlistDto(e.getId(), e.getItemType(), e.getItemId(), tp[0], tp[1], e.getNotifiedAt(), e.getCreatedAt());
                }).toList();
    }

    /** Notifies as many waiting people as there are free places right now. */
    @Transactional
    public void placesMayHaveOpened(String itemType, UUID itemId) {
        long free = freePlaces(itemType, itemId);
        if (free <= 0) return;
        String[] tp = titleAndPath(itemType, itemId);
        List<WaitlistEntry> waiting = waitlistRepository.findByItemTypeAndItemIdAndNotifiedAtIsNullOrderByCreatedAtAsc(itemType, itemId);
        for (WaitlistEntry e : waiting.stream().limit(free).toList()) {
            e.setNotifiedAt(Instant.now());
            waitlistRepository.save(e);
            notificationService.waitlistSeatAvailable(e.getUserId(), tp[0], tp[1]);
        }
    }

    private long freePlaces(String type, UUID itemId) {
        if (CLASS.equals(type)) {
            ClassEntity c = classRepository.findById(itemId).orElseThrow(() -> ApiException.notFound("Class not found"));
            return c.getCapacity() - enrollmentRepository.countByClassIdAndStatusIn(itemId, CheckoutService.SEAT_HOLDING_STATUSES);
        }
        Exhibition e = exhibitionRepository.findById(itemId).orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        if (e.getCapacity() == null) return Long.MAX_VALUE;
        return e.getCapacity() - ticketRepository.sumQuantityByExhibitionIdAndStatusIn(itemId, CheckoutService.SEAT_HOLDING_STATUSES);
    }

    private String[] titleAndPath(String type, UUID itemId) {
        if (CLASS.equals(type)) {
            return classRepository.findById(itemId).map(c -> new String[]{c.getTitle(), "/classes/" + c.getSlug()})
                    .orElse(new String[]{"Class", "/classes"});
        }
        return exhibitionRepository.findById(itemId).map(e -> new String[]{e.getTitle(), "/exhibitions/" + e.getSlug()})
                .orElse(new String[]{"Exhibition", "/exhibitions"});
    }

    private static String normalize(String itemType) {
        String t = itemType == null ? "" : itemType.trim().toUpperCase();
        if (!CLASS.equals(t) && !EXHIBITION.equals(t)) throw ApiException.badRequest("Waitlists are for classes and exhibitions");
        return t;
    }
}
