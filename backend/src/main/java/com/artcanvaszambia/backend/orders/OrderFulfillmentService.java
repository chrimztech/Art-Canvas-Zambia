package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.classes.ClassEnrollment;
import com.artcanvaszambia.backend.classes.ClassEnrollmentRepository;
import com.artcanvaszambia.backend.commissions.Commission;
import com.artcanvaszambia.backend.commissions.CommissionRepository;
import com.artcanvaszambia.backend.common.QrCodeUtil;
import com.artcanvaszambia.backend.exhibitions.ExhibitionTicket;
import com.artcanvaszambia.backend.exhibitions.ExhibitionTicketRepository;
import com.artcanvaszambia.backend.supplies.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Turns a PAID order into the domain-specific records that unlock access or
 * reserve inventory: a confirmed class enrollment, a QR-coded exhibition ticket,
 * a sold artwork, reduced supply stock, or an accepted commission.
 */
@Service
@RequiredArgsConstructor
public class OrderFulfillmentService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final ExhibitionTicketRepository exhibitionTicketRepository;
    private final ArtworkRepository artworkRepository;
    private final SupplyRepository supplyRepository;
    private final CommissionRepository commissionRepository;
    private final com.artcanvaszambia.backend.cart.CartItemRepository cartItemRepository;
    private final com.artcanvaszambia.backend.notifications.NotificationService notificationService;

    /**
     * The single entry point for "payment confirmed". Safe to call repeatedly from the
     * webhook, the manual sync and admin overrides: side effects such as stock
     * decrements only run on the first transition into PAID.
     */
    @Transactional
    public void markPaid(Order order) {
        if (Order.PAID.equals(order.getStatus()) || Order.FULFILLED.equals(order.getStatus())) {
            return;
        }
        order.setStatus(Order.PAID);
        orderRepository.save(order);
        fulfill(order);
        notificationService.orderPaid(order);
    }

    private void fulfill(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        // Purchased goods leave the buyer's cart (widget checkouts keep the cart until payment confirms).
        List<java.util.UUID> purchased = items.stream().filter(OrderItem::isPhysical).map(OrderItem::getReferenceId).toList();
        if (!purchased.isEmpty()) {
            cartItemRepository.deleteByUserIdAndItemIdIn(order.getBuyerId(), purchased);
        }
        for (OrderItem item : items) {
            switch (item.getItemType()) {
                case OrderItem.CLASS -> fulfillClass(order, item);
                case OrderItem.EXHIBITION -> fulfillExhibition(order, item);
                case OrderItem.SUPPLY -> fulfillSupply(item);
                case OrderItem.COMMISSION -> fulfillCommission(item);
                default -> fulfillArtwork(item);
            }
        }
    }

    private void fulfillArtwork(OrderItem item) {
        artworkRepository.findById(item.getReferenceId()).ifPresent(artwork -> {
            if (artwork.isOriginal() && !Artwork.SOLD.equals(artwork.getStatus())) {
                artwork.setStatus(Artwork.SOLD);
                artworkRepository.save(artwork);
            }
        });
    }

    private void fulfillSupply(OrderItem item) {
        supplyRepository.findById(item.getReferenceId()).ifPresent(supply -> {
            supply.setStock(Math.max(supply.getStock() - item.getQuantity(), 0));
            supplyRepository.save(supply);
        });
    }

    private void fulfillCommission(OrderItem item) {
        commissionRepository.findById(item.getReferenceId()).ifPresent(commission -> {
            if (Commission.QUOTED.equals(commission.getStatus())) {
                commission.setStatus(Commission.ACCEPTED);
                commissionRepository.save(commission);
                notificationService.commissionPaid(commission);
            }
        });
    }

    private void fulfillClass(Order order, OrderItem item) {
        // Reuse any earlier (e.g. cancelled) enrollment row: (class_id, student_id) is unique.
        ClassEnrollment enrollment = classEnrollmentRepository.findByOrderItemId(item.getId())
                .or(() -> classEnrollmentRepository.findByClassIdAndStudentId(item.getReferenceId(), order.getBuyerId()))
                .orElseGet(() -> {
                    ClassEnrollment e = new ClassEnrollment();
                    e.setClassId(item.getReferenceId());
                    e.setStudentId(order.getBuyerId());
                    return e;
                });
        enrollment.setOrderItemId(item.getId());
        enrollment.setStatus("paid");
        enrollment.setAmountPaidZmw(item.getLineTotalZmw());
        classEnrollmentRepository.save(enrollment);
        item.setFulfillmentStatus(OrderItem.FULFILLMENT_DELIVERED);
        item.setDeliveredAt(Instant.now());
        orderItemRepository.save(item);
    }

    private void fulfillExhibition(Order order, OrderItem item) {
        ExhibitionTicket ticket = exhibitionTicketRepository.findByOrderItemId(item.getId())
                .orElseGet(() -> {
                    ExhibitionTicket t = new ExhibitionTicket();
                    t.setExhibitionId(item.getReferenceId());
                    t.setBuyerId(order.getBuyerId());
                    t.setOrderItemId(item.getId());
                    return t;
                });
        ticket.setQuantity(item.getQuantity());
        ticket.setTotalZmw(item.getLineTotalZmw());
        ticket.setStatus("paid");
        ticket = exhibitionTicketRepository.save(ticket);
        if (ticket.getQrCode() == null) {
            ticket.setQrCode(QrCodeUtil.generateDataUri(ticket.getId().toString()));
            exhibitionTicketRepository.save(ticket);
        }
        item.setFulfillmentStatus(OrderItem.FULFILLMENT_DELIVERED);
        item.setDeliveredAt(Instant.now());
        orderItemRepository.save(item);
    }
}
