package com.artcanvaszambia.backend.payments;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.orders.Order;
import com.artcanvaszambia.backend.orders.OrderFulfillmentService;
import com.artcanvaszambia.backend.orders.OrderRepository;
import com.artcanvaszambia.backend.payouts.PayoutRequest;
import com.artcanvaszambia.backend.payouts.PayoutRequestRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Receives Lenco events. Authenticity comes from the X-Lenco-Signature HMAC, so the raw body is
 * read as a string and verified before anything is parsed or acted on.
 */
@RestController
@RequiredArgsConstructor
class LencoWebhookController {
    private final LencoClient lencoClient;
    private final LencoWebhookService webhookService;

    @PostMapping("/api/public/webhooks/lenco")
    public Map<String, String> handle(@RequestHeader(value = "X-Lenco-Signature", required = false) String signature,
                                      @RequestBody String rawBody) {
        if (!lencoClient.isValidWebhookSignature(rawBody, signature)) {
            throw ApiException.unauthorized("Invalid webhook signature");
        }
        webhookService.handle(rawBody);
        return Map.of("received", "true");
    }
}

@Service
@RequiredArgsConstructor
class LencoWebhookService {
    private static final Logger log = LoggerFactory.getLogger(LencoWebhookService.class);

    private final OrderRepository orderRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final OrderFulfillmentService orderFulfillmentService;
    private final com.artcanvaszambia.backend.notifications.NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void handle(String rawBody) {
        JsonNode root;
        try {
            root = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            throw ApiException.badRequest("Malformed webhook body");
        }
        String event = root.path("event").asText("");
        JsonNode data = root.path("data");
        String reference = data.path("reference").asText(null);
        String lencoReference = data.path("lencoReference").asText(null);
        if (reference == null) {
            log.info("Ignoring Lenco {} event without a reference", event);
            return;
        }

        switch (event) {
            case "collection.successful" -> orderRepository.findByOrderNumber(reference).ifPresent(order -> {
                if (lencoReference != null) order.setPaymentReference(lencoReference);
                orderFulfillmentService.markPaid(order);
            });
            case "collection.failed" -> orderRepository.findByOrderNumber(reference).ifPresent(order -> {
                // Never downgrade an order that has already been confirmed as paid.
                if (Order.PENDING.equals(order.getStatus())) {
                    order.setStatus(Order.CANCELLED);
                    orderRepository.save(order);
                }
            });
            case "transfer.successful" -> payoutRequestRepository.findByReferenceNo(reference).ifPresent(payout -> {
                payout.setStatus(PayoutRequest.PAID);
                if (lencoReference != null) payout.setOperatorReference(lencoReference);
                payoutRequestRepository.save(payout);
                notificationService.payoutUpdated(payout);
            });
            case "transfer.failed" -> payoutRequestRepository.findByReferenceNo(reference).ifPresent(payout -> {
                if (!PayoutRequest.PAID.equals(payout.getStatus())) {
                    payout.setStatus(PayoutRequest.FAILED);
                    String reason = data.path("reasonForFailure").asText(null);
                    payout.setAdminNote(reason != null ? reason : "Transfer failed at Lenco");
                    payoutRequestRepository.save(payout);
                    notificationService.payoutUpdated(payout);
                }
            });
            // collection.settled, transaction.credit/debit are informational for this platform.
            default -> log.info("Ignoring Lenco {} event for {}", event, reference);
        }
    }
}
