package com.artcanvaszambia.backend.reviews;

import com.artcanvaszambia.backend.classes.ClassRepository;
import com.artcanvaszambia.backend.commissions.Commission;
import com.artcanvaszambia.backend.commissions.CommissionRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.exhibitions.ExhibitionRepository;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.orders.Order;
import com.artcanvaszambia.backend.orders.OrderItem;
import com.artcanvaszambia.backend.orders.OrderItemRepository;
import com.artcanvaszambia.backend.orders.OrderRepository;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.reviews.dto.ReviewDtos.RatingDto;
import com.artcanvaszambia.backend.reviews.dto.ReviewDtos.ReviewDto;
import com.artcanvaszambia.backend.reviews.dto.ReviewDtos.ReviewRequest;
import com.artcanvaszambia.backend.reviews.dto.ReviewDtos.ReviewSummaryDto;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Verified-purchase reviews: only the buyer of a paid order item can review it, once it has been received. */
@Service
@RequiredArgsConstructor
public class ReviewService {
    private static final int PAGE = 50;

    private final ReviewRepository reviewRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final ProfileRepository profileRepository;
    private final ClassRepository classRepository;
    private final ExhibitionRepository exhibitionRepository;
    private final CommissionRepository commissionRepository;
    private final NotificationService notificationService;

    @Transactional
    public ReviewDto submit(ReviewRequest req) {
        UUID me = SecurityUtils.currentUserId();
        OrderItem item = orderItemRepository.findById(req.orderItemId())
                .orElseThrow(() -> ApiException.notFound("Purchase not found"));
        Order order = orderRepository.findById(item.getOrderId()).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!order.getBuyerId().equals(me)) {
            throw ApiException.forbidden("You can only review things you bought");
        }
        if (item.getSellerId() == null) {
            throw ApiException.badRequest("This purchase can't be reviewed");
        }
        requireReviewable(order, item);

        Review review = reviewRepository.findByOrderItemId(item.getId()).orElse(null);
        boolean created = review == null;
        if (created) {
            review = new Review();
            review.setOrderItemId(item.getId());
            review.setReviewerId(me);
            review.setSellerId(item.getSellerId());
            review.setItemType(item.getItemType());
            review.setReferenceId(item.getReferenceId());
            review.setItemTitle(item.getTitle());
        }
        review.setRating(req.rating());
        review.setComment(req.comment() != null && !req.comment().isBlank() ? req.comment().trim() : null);
        reviewRepository.save(review);
        if (created) {
            notificationService.reviewReceived(review);
        }
        return toDtos(List.of(review)).get(0);
    }

    private void requireReviewable(Order order, OrderItem item) {
        if (!Order.PAID.equals(order.getStatus()) && !Order.FULFILLED.equals(order.getStatus())) {
            throw ApiException.badRequest("You can review this once your order is paid");
        }
        if (item.getRefundedAt() != null) {
            throw ApiException.badRequest("Refunded purchases can't be reviewed");
        }
        Instant now = Instant.now();
        boolean ready = switch (item.getItemType()) {
            case OrderItem.CLASS -> classRepository.findById(item.getReferenceId())
                    .map(c -> c.getStartsAt().isBefore(now)).orElse(false);
            case OrderItem.EXHIBITION -> exhibitionRepository.findById(item.getReferenceId())
                    .map(e -> e.getStartsAt().isBefore(now)).orElse(false);
            case OrderItem.COMMISSION -> commissionRepository.findById(item.getReferenceId())
                    .map(c -> Commission.COMPLETED.equals(c.getStatus())).orElse(false);
            default -> OrderItem.FULFILLMENT_DELIVERED.equals(item.getFulfillmentStatus());
        };
        if (!ready) {
            throw ApiException.badRequest(switch (item.getItemType()) {
                case OrderItem.CLASS -> "You can review this class once it has taken place";
                case OrderItem.EXHIBITION -> "You can review this exhibition once it has opened";
                case OrderItem.COMMISSION -> "You can review this commission once it's completed";
                default -> "Confirm you've received this item before reviewing it";
            });
        }
    }

    @Transactional
    public ReviewDto reply(UUID reviewId, String reply) {
        Review review = reviewRepository.findById(reviewId).orElseThrow(() -> ApiException.notFound("Review not found"));
        if (!review.getSellerId().equals(SecurityUtils.currentUserId())) {
            throw ApiException.forbidden("Only the seller can reply to this review");
        }
        review.setSellerReply(reply.trim());
        review.setSellerRepliedAt(Instant.now());
        reviewRepository.save(review);
        return toDtos(List.of(review)).get(0);
    }

    public ReviewSummaryDto sellerSummary(UUID sellerId) {
        long[] histogram = new long[5];
        long count = 0;
        long total = 0;
        for (Object[] row : reviewRepository.ratingHistogram(sellerId)) {
            int rating = ((Number) row[0]).intValue();
            long n = ((Number) row[1]).longValue();
            histogram[rating - 1] = n;
            count += n;
            total += rating * n;
        }
        double average = count == 0 ? 0 : Math.round(total * 10.0 / count) / 10.0;
        List<Review> latest = reviewRepository.findBySellerIdOrderByCreatedAtDesc(sellerId, PageRequest.of(0, PAGE));
        return new ReviewSummaryDto(average, count, histogram, toDtos(latest));
    }

    public List<ReviewDto> forListing(UUID referenceId) {
        return toDtos(reviewRepository.findByReferenceIdOrderByCreatedAtDesc(referenceId, PageRequest.of(0, PAGE)));
    }

    public List<ReviewDto> adminLatest() {
        return toDtos(reviewRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 100)));
    }

    @Transactional
    public void adminDelete(UUID id) {
        reviewRepository.deleteById(id);
    }

    /** Average rating per seller, for directory cards. */
    public Map<UUID, RatingDto> ratingsFor(Collection<UUID> sellerIds) {
        Map<UUID, RatingDto> out = new HashMap<>();
        if (sellerIds.isEmpty()) return out;
        for (Object[] row : reviewRepository.averagesForSellers(sellerIds)) {
            double avg = Math.round(((Number) row[1]).doubleValue() * 10.0) / 10.0;
            out.put((UUID) row[0], new RatingDto(avg, ((Number) row[2]).longValue()));
        }
        return out;
    }

    /** The buyer's own rating per order item, for the order page. */
    public Map<UUID, Integer> ratingsByOrderItem(Collection<UUID> orderItemIds) {
        if (orderItemIds.isEmpty()) return Map.of();
        return reviewRepository.findByOrderItemIdIn(orderItemIds).stream()
                .collect(Collectors.toMap(Review::getOrderItemId, Review::getRating));
    }

    private List<ReviewDto> toDtos(List<Review> reviews) {
        Map<UUID, Profile> reviewers = profileRepository.findByIdIn(reviews.stream().map(Review::getReviewerId).distinct().toList())
                .stream().collect(Collectors.toMap(Profile::getId, Function.identity()));
        return reviews.stream().map(r -> {
            Profile p = reviewers.get(r.getReviewerId());
            return new ReviewDto(r.getId(), r.getRating(), r.getComment(), publicName(p), r.getSellerId(), r.getItemTitle(),
                    r.getItemType(), r.getReferenceId(), r.getCreatedAt(), r.getSellerReply(), r.getSellerRepliedAt());
        }).toList();
    }

    /** "Natasha Zulu" -> "Natasha Z." so reviews don't publish buyers' full names. */
    private static String publicName(Profile p) {
        if (p == null || p.getDisplayName() == null || p.getDisplayName().isBlank()) return "Verified buyer";
        String[] parts = p.getDisplayName().trim().split("\\s+");
        return parts.length == 1 ? parts[0] : parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }
}
