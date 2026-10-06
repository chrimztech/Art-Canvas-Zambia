package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.payouts.PayoutRequest;
import com.artcanvaszambia.backend.payouts.PayoutRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * ZynlePay's callback payload carries no shared secret, so authenticity is
 * checked via a `?token=` query param that must match the value configured
 * as the callback URL in the ZynlePay merchant dashboard.
 */
@RestController
@RequiredArgsConstructor
class ZynlePayWebhookController {
    private final ZynlePayWebhookService webhookService;

    @PostMapping("/api/public/webhooks/zynlepay")
    public Map<String, String> handle(@RequestParam(required = false) String token, @RequestBody Map<String, Object> payload) {
        webhookService.handle(token, payload);
        return Map.of("received", "true");
    }
}

@Service
@RequiredArgsConstructor
class ZynlePayWebhookService {
    private final OrderRepository orderRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final OrderFulfillmentService orderFulfillmentService;
    private final com.artcanvaszambia.backend.notifications.NotificationService notificationService;

    @Value("${app.zynlepay.webhook-token}")
    private String webhookToken;

    @Transactional
    public void handle(String token, Map<String, Object> payload) {
        if (token == null || !token.equals(webhookToken)) {
            throw ApiException.forbidden("Invalid webhook token");
        }
        String referenceNo = stringValue(payload.get("reference_no"));
        if (referenceNo == null) {
            throw ApiException.badRequest("Missing reference_no");
        }
        String responseCode = stringValue(payload.get("response_code"));
        String operatorReference = stringValue(payload.get("operator_reference"));
        boolean success = "100".equals(responseCode);
        boolean failed = !success && !"120".equals(responseCode) && !"990".equals(responseCode);

        var orderOpt = orderRepository.findByOrderNumber(referenceNo);
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            if (operatorReference != null) order.setPaymentReference(operatorReference);
            if (success) {
                orderFulfillmentService.markPaid(order);
            } else if (failed && Order.PENDING.equals(order.getStatus())) {
                // Never downgrade an order that has already been confirmed as paid.
                order.setStatus(Order.CANCELLED);
                orderRepository.save(order);
            } else {
                orderRepository.save(order);
            }
            return;
        }

        var payoutOpt = payoutRequestRepository.findByReferenceNo(referenceNo);
        if (payoutOpt.isPresent()) {
            PayoutRequest payout = payoutOpt.get();
            if (success) {
                payout.setStatus(PayoutRequest.PAID);
            } else if (failed) {
                payout.setStatus(PayoutRequest.FAILED);
            }
            if (operatorReference != null) payout.setOperatorReference(operatorReference);
            payoutRequestRepository.save(payout);
            notificationService.payoutUpdated(payout);
            return;
        }

        throw ApiException.notFound("No order or payout found for reference " + referenceNo);
    }

    private String stringValue(Object o) {
        return o != null ? String.valueOf(o) : null;
    }
}
