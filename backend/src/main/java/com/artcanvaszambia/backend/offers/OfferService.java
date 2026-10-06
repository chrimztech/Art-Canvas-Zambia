package com.artcanvaszambia.backend.offers;

import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.orders.CheckoutService;
import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * "Make an offer": a buyer proposes a price (at least half the asking price), the artist accepts,
 * declines or counters, and an accepted price can be paid within three days.
 */
@Service
@RequiredArgsConstructor
public class OfferService {
    private static final Duration WINDOW = Duration.ofDays(3);
    private static final BigDecimal MIN_FRACTION = new BigDecimal("0.5");

    private final OfferRepository offerRepository;
    private final ArtworkRepository artworkRepository;
    private final ProfileRepository profileRepository;
    private final NotificationService notificationService;
    private final CheckoutService checkoutService;

    public record MakeOfferRequest(UUID artworkId, BigDecimal amountZmw, String message) {
    }

    public record RespondRequest(String action, BigDecimal counterAmountZmw) {
    }

    public record OfferDto(UUID id, UUID artworkId, String artworkTitle, String artworkSlug, String artworkCoverUrl,
                           BigDecimal listPriceZmw, UUID buyerId, String buyerName, UUID artistId, String artistName,
                           BigDecimal amountZmw, BigDecimal counterAmountZmw, String message, String status,
                           Instant expiresAt, Instant createdAt) {
    }

    @Transactional
    public OfferDto make(MakeOfferRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        Artwork a = artworkRepository.findById(req.artworkId()).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        if (a.getArtistId().equals(buyerId)) throw ApiException.badRequest("You can't make an offer on your own work");
        if (!Artwork.PUBLISHED.equals(a.getStatus())) throw ApiException.badRequest("This artwork isn't available");
        if (!a.isAcceptsOffers()) throw ApiException.badRequest("The artist isn't accepting offers on this piece");
        BigDecimal amount = req.amountZmw() == null ? null : req.amountZmw().setScale(2, RoundingMode.HALF_UP);
        if (amount == null || amount.signum() <= 0) throw ApiException.badRequest("Enter an offer amount");
        if (amount.compareTo(a.getPriceZmw()) >= 0) {
            throw ApiException.badRequest("Your offer is at or above the asking price — just add it to your cart");
        }
        BigDecimal floor = a.getPriceZmw().multiply(MIN_FRACTION).setScale(0, RoundingMode.UP);
        if (amount.compareTo(floor) < 0) {
            throw ApiException.badRequest("Offers must be at least K" + floor.toPlainString() + " (half the asking price)");
        }
        expireStale(offerRepository.findByArtworkIdAndBuyerIdAndStatusIn(a.getId(), buyerId, Offer.OPEN));
        if (!offerRepository.findByArtworkIdAndBuyerIdAndStatusIn(a.getId(), buyerId, Offer.OPEN).isEmpty()) {
            throw ApiException.conflict("You already have an open offer on this artwork");
        }
        Offer o = new Offer();
        o.setArtworkId(a.getId());
        o.setBuyerId(buyerId);
        o.setArtistId(a.getArtistId());
        o.setAmountZmw(amount);
        o.setMessage(req.message() == null || req.message().isBlank() ? null : req.message().trim());
        o.setExpiresAt(Instant.now().plus(WINDOW));
        offerRepository.save(o);
        notificationService.offerReceived(a.getArtistId(), buyerId, a.getTitle(), amount, o.getMessage());
        return toDtos(List.of(o)).get(0);
    }

    /** Artist: accept, decline or counter a pending offer. */
    @Transactional
    public OfferDto respond(UUID id, RespondRequest req) {
        Offer o = load(id);
        if (!o.getArtistId().equals(SecurityUtils.currentUserId())) throw ApiException.forbidden("Not your offer");
        if (!Offer.PENDING.equals(o.getStatus())) throw ApiException.badRequest("This offer is no longer pending");
        Artwork a = artworkRepository.findById(o.getArtworkId()).orElseThrow(() -> ApiException.notFound("Artwork not found"));
        String action = req.action() == null ? "" : req.action().trim().toLowerCase();
        switch (action) {
            case "accept" -> {
                o.setStatus(Offer.ACCEPTED);
                o.setExpiresAt(Instant.now().plus(WINDOW));
            }
            case "decline" -> o.setStatus(Offer.DECLINED);
            case "counter" -> {
                BigDecimal counter = req.counterAmountZmw();
                if (counter == null || counter.compareTo(o.getAmountZmw()) <= 0 || counter.compareTo(a.getPriceZmw()) >= 0) {
                    throw ApiException.badRequest("A counter-offer must be between the offer and your asking price");
                }
                o.setCounterAmountZmw(counter.setScale(2, RoundingMode.HALF_UP));
                o.setStatus(Offer.COUNTERED);
                o.setExpiresAt(Instant.now().plus(WINDOW));
            }
            default -> throw ApiException.badRequest("Action must be accept, decline or counter");
        }
        o.setRespondedAt(Instant.now());
        offerRepository.save(o);
        notificationService.offerUpdated(o.getBuyerId(), o.getArtistId(), a.getTitle(),
                Offer.COUNTERED.equals(o.getStatus()) ? "countered" : o.getStatus(),
                Offer.COUNTERED.equals(o.getStatus()) ? o.getCounterAmountZmw() : o.getAmountZmw());
        return toDtos(List.of(o)).get(0);
    }

    /** Buyer: take the artist's counter-offer. */
    @Transactional
    public OfferDto acceptCounter(UUID id) {
        Offer o = load(id);
        if (!o.getBuyerId().equals(SecurityUtils.currentUserId())) throw ApiException.forbidden("Not your offer");
        if (!Offer.COUNTERED.equals(o.getStatus())) throw ApiException.badRequest("There's no counter-offer to accept");
        o.setAmountZmw(o.getCounterAmountZmw());
        o.setStatus(Offer.ACCEPTED);
        o.setExpiresAt(Instant.now().plus(WINDOW));
        offerRepository.save(o);
        String title = artworkRepository.findById(o.getArtworkId()).map(Artwork::getTitle).orElse("artwork");
        notificationService.counterAccepted(o.getArtistId(), o.getBuyerId(), title, o.getAmountZmw());
        return toDtos(List.of(o)).get(0);
    }

    @Transactional
    public OfferDto withdraw(UUID id) {
        Offer o = load(id);
        if (!o.getBuyerId().equals(SecurityUtils.currentUserId())) throw ApiException.forbidden("Not your offer");
        if (!Offer.PENDING.equals(o.getStatus()) && !Offer.COUNTERED.equals(o.getStatus())) {
            throw ApiException.badRequest("This offer can't be withdrawn now");
        }
        o.setStatus(Offer.WITHDRAWN);
        offerRepository.save(o);
        return toDtos(List.of(o)).get(0);
    }

    /** Buyer: pay the agreed price. */
    public CheckoutResponse checkout(UUID id, CheckoutRequest req) {
        Offer o = load(id);
        if (!o.getBuyerId().equals(SecurityUtils.currentUserId())) throw ApiException.forbidden("Not your offer");
        if (!Offer.ACCEPTED.equals(o.getStatus())) throw ApiException.badRequest("Only accepted offers can be paid");
        return checkoutService.checkoutOffer(o, req);
    }

    public List<OfferDto> asBuyer() {
        List<Offer> offers = offerRepository.findByBuyerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId());
        expireStale(offers);
        return toDtos(offers);
    }

    public List<OfferDto> asArtist() {
        List<Offer> offers = offerRepository.findByArtistIdOrderByCreatedAtDesc(SecurityUtils.currentUserId());
        expireStale(offers);
        return toDtos(offers);
    }

    private Offer load(UUID id) {
        Offer o = offerRepository.findById(id).orElseThrow(() -> ApiException.notFound("Offer not found"));
        if (o.expireIfDue(Instant.now())) {
            offerRepository.save(o);
        }
        return o;
    }

    private void expireStale(List<Offer> offers) {
        Instant now = Instant.now();
        for (Offer o : offers) {
            if (o.expireIfDue(now)) offerRepository.save(o);
        }
    }

    private List<OfferDto> toDtos(List<Offer> offers) {
        Map<UUID, Artwork> artworks = artworkRepository.findAllById(offers.stream().map(Offer::getArtworkId).distinct().toList())
                .stream().collect(Collectors.toMap(Artwork::getId, Function.identity()));
        Map<UUID, Profile> people = profileRepository.findByIdIn(offers.stream()
                        .flatMap(o -> Stream.of(o.getBuyerId(), o.getArtistId())).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Profile::getId, Function.identity()));
        return offers.stream().map(o -> {
            Artwork a = artworks.get(o.getArtworkId());
            Profile buyer = people.get(o.getBuyerId());
            Profile artist = people.get(o.getArtistId());
            return new OfferDto(o.getId(), o.getArtworkId(), a != null ? a.getTitle() : null, a != null ? a.getSlug() : null,
                    a != null ? a.getCoverImageUrl() : null, a != null ? a.getPriceZmw() : null, o.getBuyerId(),
                    buyer != null ? buyer.getDisplayName() : null, o.getArtistId(), artist != null ? artist.getDisplayName() : null,
                    o.getAmountZmw(), o.getCounterAmountZmw(), o.getMessage(), o.getStatus(), o.getExpiresAt(), o.getCreatedAt());
        }).toList();
    }
}
