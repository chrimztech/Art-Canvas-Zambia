package com.artcanvaszambia.backend.refunds;

import com.artcanvaszambia.backend.audit.AuditService;
import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.classes.ClassEnrollmentRepository;
import com.artcanvaszambia.backend.commissions.Commission;
import com.artcanvaszambia.backend.commissions.CommissionRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.exhibitions.ExhibitionTicketRepository;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.orders.Order;
import com.artcanvaszambia.backend.orders.OrderItem;
import com.artcanvaszambia.backend.orders.OrderItemRepository;
import com.artcanvaszambia.backend.orders.OrderRepository;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.refunds.dto.RefundDtos.RefundDto;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
 * Refund requests. Buyers ask per order item, sellers may respond, admins decide. Approving
 * ("refunded") records that the money was returned to the buyer (sent from the payment gateway's
 * dashboard), removes the sale from the seller's earnings and revokes digital entitlements.
 */
@Service
@RequiredArgsConstructor
public class RefundService {
    private static final Duration REQUEST_WINDOW = Duration.ofDays(60);

    private final RefundRequestRepository refundRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final ClassEnrollmentRepository enrollmentRepository;
    private final ExhibitionTicketRepository ticketRepository;
    private final CommissionRepository commissionRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Transactional
    public RefundDto request(UUID orderItemId, String reason) {
        UUID me = SecurityUtils.currentUserId();
        OrderItem item = orderItemRepository.findById(orderItemId).orElseThrow(() -> ApiException.notFound("Purchase not found"));
        Order order = orderRepository.findById(item.getOrderId()).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!order.getBuyerId().equals(me)) {
            throw ApiException.forbidden("You can only request refunds for your own purchases");
        }
        if (!Order.PAID.equals(order.getStatus()) && !Order.FULFILLED.equals(order.getStatus())) {
            throw ApiException.badRequest("Only paid orders can be refunded");
        }
        if (item.getRefundedAt() != null) {
            throw ApiException.badRequest("This item has already been refunded");
        }
        if (order.getCreatedAt().isBefore(Instant.now().minus(REQUEST_WINDOW))) {
            throw ApiException.badRequest("Refunds can be requested within 60 days of purchase");
        }
        if (refundRepository.existsByOrderItemIdAndStatus(orderItemId, RefundRequest.REQUESTED)) {
            throw ApiException.conflict("You already have an open refund request for this item");
        }
        RefundRequest r = new RefundRequest();
        r.setOrderItemId(item.getId());
        r.setOrderId(order.getId());
        r.setBuyerId(me);
        r.setSellerId(item.getSellerId());
        r.setAmountZmw(item.getLineTotalZmw());
        r.setReason(reason.trim());
        refundRepository.save(r);
        notificationService.refundRequested(r, item, order);
        return toDtos(List.of(r)).get(0);
    }

    public List<RefundDto> mine() {
        return toDtos(refundRepository.findByBuyerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()));
    }

    public List<RefundDto> forSeller() {
        return toDtos(refundRepository.findBySellerIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()));
    }

    @Transactional
    public RefundDto sellerRespond(UUID id, String response) {
        RefundRequest r = refundRepository.findById(id).orElseThrow(() -> ApiException.notFound("Refund request not found"));
        if (!SecurityUtils.currentUserId().equals(r.getSellerId())) {
            throw ApiException.forbidden("Not your sale");
        }
        if (!RefundRequest.REQUESTED.equals(r.getStatus())) {
            throw ApiException.badRequest("This request has already been resolved");
        }
        r.setSellerResponse(response.trim());
        refundRepository.save(r);
        return toDtos(List.of(r)).get(0);
    }

    public List<RefundDto> adminList() {
        return toDtos(refundRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 200)));
    }

    @Transactional
    public RefundDto resolve(UUID id, String decision, String note) {
        RefundRequest r = refundRepository.findById(id).orElseThrow(() -> ApiException.notFound("Refund request not found"));
        if (!RefundRequest.REQUESTED.equals(r.getStatus())) {
            throw ApiException.badRequest("This request has already been resolved");
        }
        String normalized = decision == null ? "" : decision.trim().toLowerCase();
        if (!RefundRequest.REFUNDED.equals(normalized) && !RefundRequest.REJECTED.equals(normalized)) {
            throw ApiException.badRequest("Decision must be refunded or rejected");
        }
        r.setStatus(normalized);
        r.setAdminNote(note != null && !note.isBlank() ? note.trim() : null);
        r.setResolvedBy(SecurityUtils.currentUserId());
        r.setResolvedAt(Instant.now());
        refundRepository.save(r);

        OrderItem item = orderItemRepository.findById(r.getOrderItemId()).orElseThrow(() -> ApiException.notFound("Purchase not found"));
        Order order = orderRepository.findById(r.getOrderId()).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (RefundRequest.REFUNDED.equals(normalized)) {
            applyRefund(order, item);
        }
        auditService.record("REFUND_" + normalized.toUpperCase(), "ORDER", order.getId(), order.getOrderNumber(),
                item.getTitle() + " K" + r.getAmountZmw());
        notificationService.refundResolved(r, item, order);
        return toDtos(List.of(r)).get(0);
    }

    private void applyRefund(Order order, OrderItem item) {
        item.setRefundedAt(Instant.now());
        orderItemRepository.save(item);
        switch (item.getItemType()) {
            case OrderItem.CLASS -> enrollmentRepository.findByOrderItemId(item.getId()).ifPresent(e -> {
                e.setStatus("cancelled");
                enrollmentRepository.save(e);
            });
            case OrderItem.EXHIBITION -> ticketRepository.findByOrderItemId(item.getId()).ifPresent(t -> {
                t.setStatus("cancelled");
                ticketRepository.save(t);
            });
            case OrderItem.COMMISSION -> commissionRepository.findById(item.getReferenceId()).ifPresent(c -> {
                if (!Commission.COMPLETED.equals(c.getStatus())) {
                    c.setStatus(Commission.CANCELLED);
                    commissionRepository.save(c);
                }
            });
            default -> {
                // Physical goods: returns and relisting are arranged between buyer and seller.
            }
        }
        boolean allRefunded = orderItemRepository.findByOrderId(order.getId()).stream().allMatch(i -> i.getRefundedAt() != null);
        if (allRefunded) {
            order.setStatus(Order.REFUNDED);
            orderRepository.save(order);
        }
    }

    private List<RefundDto> toDtos(List<RefundRequest> refunds) {
        Map<UUID, OrderItem> items = orderItemRepository.findAllById(refunds.stream().map(RefundRequest::getOrderItemId).distinct().toList())
                .stream().collect(Collectors.toMap(OrderItem::getId, Function.identity()));
        Map<UUID, Order> orders = orderRepository.findAllById(refunds.stream().map(RefundRequest::getOrderId).distinct().toList())
                .stream().collect(Collectors.toMap(Order::getId, Function.identity()));
        List<UUID> people = refunds.stream().flatMap(r -> Stream.of(r.getBuyerId(), r.getSellerId())).filter(Objects::nonNull).distinct().toList();
        Map<UUID, Profile> profiles = profileRepository.findByIdIn(people).stream().collect(Collectors.toMap(Profile::getId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(people).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        UUID viewer = SecurityUtils.currentUserId();
        boolean admin = SecurityUtils.isAdminOrAbove();
        return refunds.stream().map(r -> {
            OrderItem i = items.get(r.getOrderItemId());
            Order o = orders.get(r.getOrderId());
            Profile buyer = profiles.get(r.getBuyerId());
            Profile seller = r.getSellerId() != null ? profiles.get(r.getSellerId()) : null;
            User buyerUser = users.get(r.getBuyerId());
            boolean partyOrAdmin = admin || viewer.equals(r.getSellerId()) || viewer.equals(r.getBuyerId());
            String phone = admin && o != null && o.getShippingAddress() != null ? o.getShippingAddress().get("phone") : null;
            return new RefundDto(r.getId(), r.getOrderId(), o != null ? o.getOrderNumber() : null, r.getOrderItemId(),
                    i != null ? i.getTitle() : null, i != null ? i.getItemType() : null, r.getAmountZmw(), r.getReason(),
                    r.getStatus(), r.getSellerResponse(), r.getAdminNote(), r.getBuyerId(),
                    buyer != null ? buyer.getDisplayName() : null,
                    partyOrAdmin && buyerUser != null ? buyerUser.getEmail() : null,
                    r.getSellerId(), seller != null ? seller.getDisplayName() : null,
                    admin && o != null ? o.getPaymentProvider() : null, admin && o != null ? o.getPaymentReference() : null,
                    phone, r.getCreatedAt(), r.getResolvedAt());
        }).toList();
    }
}
