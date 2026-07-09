package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.orders.dto.OrderDetailDto;
import com.artcanvaszambia.backend.orders.dto.OrderItemDto;
import com.artcanvaszambia.backend.orders.dto.OrderSummaryDto;
import com.artcanvaszambia.backend.orders.dto.SaleDto;
import com.artcanvaszambia.backend.payments.ZynlePayClient;
import com.artcanvaszambia.backend.payments.ZynlePayResult;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ZynlePayClient zynlePayClient;
    private final OrderFulfillmentService orderFulfillmentService;

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
        List<OrderItemDto> items = orderItemRepository.findByOrderId(id).stream()
                .map(i -> new OrderItemDto(i.getId(), i.getArtworkId(), i.getItemType(), i.getReferenceId(), i.getTitle(),
                        i.getUnitPriceZmw(), i.getQuantity(), i.getLineTotalZmw(), i.getPlatformFeeZmw(), i.getRoyaltyZmw(), i.getArtistPayoutZmw()))
                .toList();
        return new OrderDetailDto(o.getId(), o.getOrderNumber(), o.getStatus(), o.getSubtotalZmw(),
                o.getPlatformFeeZmw(), o.getRoyaltyZmw(), o.getTotalZmw(), o.getPaymentProvider(),
                o.getPaymentReference(), o.getCreatedAt(), items);
    }

    @Transactional
    public OrderDetailDto syncStatus(UUID id) {
        Order o = orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Order not found"));
        SecurityUtils.requireOwnerOrAdmin(o.getBuyerId());
        if (Order.PENDING.equals(o.getStatus())) {
            ZynlePayResult result = zynlePayClient.paymentStatus(o.getOrderNumber());
            if (result.isSuccess()) {
                o.setStatus(Order.PAID);
                orderRepository.save(o);
                orderFulfillmentService.fulfill(o);
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
        Map<UUID, Order> orders = orderRepository.findAllById(items.stream().map(OrderItem::getOrderId).toList())
                .stream().collect(Collectors.toMap(Order::getId, o -> o));
        return items.stream().map(i -> {
            Order o = orders.get(i.getOrderId());
            return new SaleDto(i.getId(), i.getTitle(), i.getQuantity(), i.getLineTotalZmw(), i.getPlatformFeeZmw(),
                    i.getRoyaltyZmw(), i.getArtistPayoutZmw(), i.getCreatedAt(),
                    o != null ? o.getOrderNumber() : null, o != null ? o.getStatus() : null);
        }).toList();
    }
}
