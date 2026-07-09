package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.classes.ClassEnrollment;
import com.artcanvaszambia.backend.classes.ClassEnrollmentRepository;
import com.artcanvaszambia.backend.common.QrCodeUtil;
import com.artcanvaszambia.backend.exhibitions.ExhibitionTicket;
import com.artcanvaszambia.backend.exhibitions.ExhibitionTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Turns a PAID order into the domain-specific records that unlock access:
 * a confirmed class enrollment, or a confirmed, QR-coded exhibition ticket.
 * Idempotent so it can safely run from both the webhook and the manual sync path.
 */
@Service
@RequiredArgsConstructor
public class OrderFulfillmentService {
    private final OrderItemRepository orderItemRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final ExhibitionTicketRepository exhibitionTicketRepository;

    @Transactional
    public void fulfill(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        for (OrderItem item : items) {
            if (OrderItem.CLASS.equals(item.getItemType())) {
                fulfillClass(order, item);
            } else if (OrderItem.EXHIBITION.equals(item.getItemType())) {
                fulfillExhibition(order, item);
            }
        }
    }

    private void fulfillClass(Order order, OrderItem item) {
        ClassEnrollment enrollment = classEnrollmentRepository.findByOrderItemId(item.getId())
                .orElseGet(() -> {
                    ClassEnrollment e = new ClassEnrollment();
                    e.setClassId(item.getReferenceId());
                    e.setStudentId(order.getBuyerId());
                    e.setOrderItemId(item.getId());
                    return e;
                });
        enrollment.setStatus("paid");
        enrollment.setAmountPaidZmw(item.getLineTotalZmw());
        classEnrollmentRepository.save(enrollment);
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
    }
}
