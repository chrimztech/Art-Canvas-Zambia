package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.orders.dto.OrderDetailDto;
import com.artcanvaszambia.backend.orders.dto.OrderItemDto;
import com.artcanvaszambia.backend.orders.dto.OrderSummaryDto;
import com.artcanvaszambia.backend.orders.dto.SaleDto;
import com.artcanvaszambia.backend.orders.dto.ShipItemRequest;
import com.artcanvaszambia.backend.payments.LencoClient;
import com.artcanvaszambia.backend.payments.LencoResult;
import com.artcanvaszambia.backend.payments.PaymentProviders;
import com.artcanvaszambia.backend.payments.ZynlePayClient;
import com.artcanvaszambia.backend.payments.ZynlePayResult;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ZynlePayClient zynlePayClient;
    private final LencoClient lencoClient;
    private final OrderFulfillmentService orderFulfillmentService;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final com.artcanvaszambia.backend.notifications.NotificationService notificationService;
    private final com.artcanvaszambia.backend.reviews.ReviewService reviewService;
    private final com.artcanvaszambia.backend.refunds.RefundRequestRepository refundRequestRepository;

    public List<OrderSummaryDto> mine() {
        UUID buyerId = SecurityUtils.currentUserId();
        return orderRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId).stream()
                .map(o -> new OrderSummaryDto(o.getId(), o.getOrderNumber(), o.getStatus(), o.getTotalZmw(),
                        o.getPaymentProvider(), o.getCreatedAt()))
                .toList();
    }

    public OrderDetailDto get(UUID id) {
        Order o = orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Order not found"));
        SecurityUtils.requireOwnerOrAdmin(o.getBuyerId());
        List<OrderItem> items = orderItemRepository.findByOrderId(id);
        List<UUID> itemIds = items.stream().map(OrderItem::getId).toList();
        Map<UUID, Integer> ratings = reviewService.ratingsByOrderItem(itemIds);
        // Latest request per item wins (requests are created in order; a rejected one can be followed by a new one).
        Map<UUID, String> refundStatus = refundRequestRepository.findByOrderItemIdIn(itemIds).stream()
                .sorted(java.util.Comparator.comparing(com.artcanvaszambia.backend.refunds.RefundRequest::getCreatedAt))
                .collect(Collectors.toMap(com.artcanvaszambia.backend.refunds.RefundRequest::getOrderItemId,
                        com.artcanvaszambia.backend.refunds.RefundRequest::getStatus, (a, b) -> b));
        Map<UUID, Profile> sellers = profileRepository.findByIdIn(
                        items.stream().map(OrderItem::getSellerId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Profile::getId, Function.identity()));
        List<OrderItemDto> itemDtos = items.stream()
                .map(i -> {
                    Profile seller = i.getSellerId() != null ? sellers.get(i.getSellerId()) : null;
                    return new OrderItemDto(i.getId(), i.getArtworkId(), i.getItemType(), i.getReferenceId(), i.getTitle(),
                            i.getUnitPriceZmw(), i.getQuantity(), i.getLineTotalZmw(), i.getPlatformFeeZmw(), i.getRoyaltyZmw(),
                            i.getArtistPayoutZmw(), i.getSellerId(), seller != null ? seller.getDisplayName() : null,
                            i.getFulfillmentStatus(), i.getCarrier(), i.getTrackingNumber(), i.getShippedAt(),
                            i.getDeliveredAt(), i.isPhysical(), ratings.get(i.getId()), refundStatus.get(i.getId()),
                            i.getRefundedAt() != null);
                })
                .toList();
        return new OrderDetailDto(o.getId(), o.getOrderNumber(), o.getStatus(), o.getSubtotalZmw(),
                o.getPlatformFeeZmw(), o.getRoyaltyZmw(), o.getTotalZmw(), o.getPaymentProvider(),
                o.getPaymentReference(), o.getCreatedAt(), itemDtos, o.getShippingAddress());
    }

    @Transactional
    public OrderDetailDto syncStatus(UUID id) {
        Order o = orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Order not found"));
        SecurityUtils.requireOwnerOrAdmin(o.getBuyerId());
        if (Order.PENDING.equals(o.getStatus()) && PaymentProviders.LENCO.equals(o.getPaymentProvider())) {
            LencoResult result = lencoClient.collectionStatus(o.getOrderNumber());
            boolean abandoned = !result.accepted() && o.getCreatedAt().isBefore(Instant.now().minus(java.time.Duration.ofHours(1)));
            if (result.isSuccessful()) {
                orderFulfillmentService.markPaid(o);
            } else if ((result.accepted() && "failed".equals(result.transactionStatus())) || abandoned) {
                // Failed outright, or a widget checkout that was never completed within the hour.
                o.setStatus(Order.CANCELLED);
                orderRepository.save(o);
            }
        } else if (Order.PENDING.equals(o.getStatus())) {
            ZynlePayResult result = zynlePayClient.paymentStatus(o.getOrderNumber());
            if (result.isSuccess()) {
                orderFulfillmentService.markPaid(o);
            } else if ("995".equals(result.responseCode())) {
                o.setStatus(Order.CANCELLED);
                orderRepository.save(o);
            }
        }
        return get(id);
    }

    public List<SaleDto> mySales() {
        UUID sellerId = SecurityUtils.currentUserId();
        List<OrderItem> items = orderItemRepository.findBySellerIdOrderByCreatedAtDesc(sellerId);
        Map<UUID, Order> orders = orderRepository.findAllById(items.stream().map(OrderItem::getOrderId).distinct().toList())
                .stream().collect(Collectors.toMap(Order::getId, o -> o));
        List<UUID> buyerIds = orders.values().stream().map(Order::getBuyerId).distinct().toList();
        Map<UUID, Profile> buyers = profileRepository.findByIdIn(buyerIds).stream()
                .collect(Collectors.toMap(Profile::getId, Function.identity()));
        Map<UUID, User> buyerUsers = userRepository.findAllById(buyerIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return items.stream().map(i -> {
            Order o = orders.get(i.getOrderId());
            boolean paid = o != null && (Order.PAID.equals(o.getStatus()) || Order.FULFILLED.equals(o.getStatus()));
            Profile buyer = o != null ? buyers.get(o.getBuyerId()) : null;
            User buyerUser = o != null ? buyerUsers.get(o.getBuyerId()) : null;
            // Buyer contact and delivery details are only shared once the order is paid.
            return new SaleDto(i.getId(), i.getTitle(), i.getQuantity(), i.getLineTotalZmw(), i.getPlatformFeeZmw(),
                    i.getRoyaltyZmw(), i.getArtistPayoutZmw(), i.getCreatedAt(),
                    o != null ? o.getOrderNumber() : null, o != null ? o.getStatus() : null,
                    i.getOrderId(), i.getItemType(), i.getFulfillmentStatus(), i.getCarrier(), i.getTrackingNumber(),
                    paid && buyer != null ? buyer.getDisplayName() : null,
                    paid && buyerUser != null ? buyerUser.getEmail() : null,
                    paid && i.isPhysical() ? o.getShippingAddress() : null,
                    i.getRefundedAt() != null,
                    o != null ? o.getBuyerId() : null);
        }).toList();
    }

    /** Seller marks a paid physical item as dispatched, optionally with courier tracking. */
    @Transactional
    public void markShipped(UUID itemId, ShipItemRequest req) {
        OrderItem item = orderItemRepository.findById(itemId).orElseThrow(() -> ApiException.notFound("Sale not found"));
        if (!SecurityUtils.currentUserId().equals(item.getSellerId()) && !SecurityUtils.isAdminOrAbove()) {
            throw ApiException.forbidden("Not your sale");
        }
        Order order = orderRepository.findById(item.getOrderId()).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!Order.PAID.equals(order.getStatus())) {
            throw ApiException.badRequest("Only paid orders can be shipped");
        }
        if (!item.isPhysical()) {
            throw ApiException.badRequest("This item doesn't need shipping");
        }
        if (OrderItem.FULFILLMENT_DELIVERED.equals(item.getFulfillmentStatus())) {
            throw ApiException.badRequest("This item has already been delivered");
        }
        item.setFulfillmentStatus(OrderItem.FULFILLMENT_SHIPPED);
        item.setCarrier(blankToNull(req != null ? req.carrier() : null));
        item.setTrackingNumber(blankToNull(req != null ? req.trackingNumber() : null));
        item.setShippedAt(Instant.now());
        orderItemRepository.save(item);
        notificationService.itemShipped(order, item);
    }

    /** Buyer confirms a physical item arrived; the order completes once everything has. */
    @Transactional
    public OrderDetailDto confirmReceived(UUID orderId, UUID itemId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        SecurityUtils.requireOwnerOrAdmin(order.getBuyerId());
        OrderItem item = orderItemRepository.findById(itemId)
                .filter(i -> i.getOrderId().equals(orderId))
                .orElseThrow(() -> ApiException.notFound("Order item not found"));
        if (!Order.PAID.equals(order.getStatus())) {
            throw ApiException.badRequest("Only paid orders can be marked as received");
        }
        item.setFulfillmentStatus(OrderItem.FULFILLMENT_DELIVERED);
        item.setDeliveredAt(Instant.now());
        orderItemRepository.save(item);

        boolean allDelivered = orderItemRepository.findByOrderId(orderId).stream()
                .filter(OrderItem::isPhysical)
                .allMatch(i -> OrderItem.FULFILLMENT_DELIVERED.equals(i.getFulfillmentStatus()));
        if (allDelivered) {
            order.setStatus(Order.FULFILLED);
            orderRepository.save(order);
        }
        return get(orderId);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
