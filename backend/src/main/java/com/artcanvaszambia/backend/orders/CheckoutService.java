package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.cart.CartItem;
import com.artcanvaszambia.backend.cart.CartItemRepository;
import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.classes.ClassEntity;
import com.artcanvaszambia.backend.classes.ClassRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.exhibitions.Exhibition;
import com.artcanvaszambia.backend.exhibitions.ExhibitionRepository;
import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import com.artcanvaszambia.backend.payments.ZynlePayClient;
import com.artcanvaszambia.backend.payments.ZynlePayResult;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.supplies.Supply;
import com.artcanvaszambia.backend.supplies.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckoutService {
    private final CartItemRepository cartItemRepository;
    private final ArtworkRepository artworkRepository;
    private final SupplyRepository supplyRepository;
    private final ClassRepository classRepository;
    private final ExhibitionRepository exhibitionRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PlatformSettingsRepository platformSettingsRepository;
    private final UserRepository userRepository;
    private final ZynlePayClient zynlePayClient;

    private record Line(String itemType, UUID referenceId, UUID sellerId, String title, int quantity,
                         BigDecimal lineTotal, BigDecimal fee, BigDecimal roy, BigDecimal payout) {
    }

    // Deliberately not @Transactional: the ZynlePay call happens after the order
    // and its items are created, and a payment failure must still leave the order
    // persisted (as "cancelled") rather than rolling back the whole checkout.
    public CheckoutResponse checkout(CheckoutRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        List<CartItem> cart = cartItemRepository.findByUserId(buyerId);
        if (cart.isEmpty()) {
            throw ApiException.badRequest("Cart is empty");
        }
        validatePaymentInputs(req);

        BigDecimal feePct = platformFeePercent();
        BigDecimal royPct = developerRoyaltyPercent();
        List<Line> lines = new ArrayList<>();
        for (CartItem c : cart) {
            lines.add(priceLine(c.getItemType(), c.getItemId(), c.getQuantity(), feePct, royPct));
        }

        Order order = createOrderAndItems(buyerId, lines);
        cartItemRepository.deleteByUserId(buyerId);
        return charge(order, req);
    }

    // Direct "buy now" checkout for single-item purchases (classes, exhibition tickets)
    // that don't go through the cart.
    public CheckoutResponse checkoutSingleItem(String itemType, UUID referenceId, int quantity, CheckoutRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        validatePaymentInputs(req);
        BigDecimal feePct = platformFeePercent();
        BigDecimal royPct = developerRoyaltyPercent();
        Line line = priceLine(itemType, referenceId, quantity, feePct, royPct);
        Order order = createOrderAndItems(buyerId, List.of(line));
        return charge(order, req);
    }

    private void validatePaymentInputs(CheckoutRequest req) {
        if (!"card".equals(req.paymentMethod()) && !"momo".equals(req.paymentMethod())) {
            throw ApiException.badRequest("Unknown payment method");
        }
        if (req.phone() == null || req.phone().isBlank()) {
            throw ApiException.badRequest("A phone number is required");
        }
    }

    private BigDecimal platformFeePercent() {
        return platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new).getPlatformFeePercent();
    }

    private BigDecimal developerRoyaltyPercent() {
        return platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new).getDeveloperRoyaltyPercent();
    }

    private Line priceLine(String itemType, UUID referenceId, int quantity, BigDecimal feePct, BigDecimal royPct) {
        String title;
        UUID sellerId;
        BigDecimal unitPrice;

        switch (itemType) {
            case OrderItem.SUPPLY -> {
                Supply s = supplyRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.badRequest("Cart contains a removed supply"));
                title = s.getName();
                sellerId = s.getSellerId();
                unitPrice = s.getPriceZmw();
            }
            case OrderItem.CLASS -> {
                ClassEntity c = classRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.notFound("Class not found"));
                title = c.getTitle();
                sellerId = c.getInstructorId();
                unitPrice = c.getPriceZmw();
            }
            case OrderItem.EXHIBITION -> {
                Exhibition e = exhibitionRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.notFound("Exhibition not found"));
                title = e.getTitle();
                sellerId = e.getOrganizerId();
                unitPrice = e.getTicketPriceZmw();
            }
            default -> {
                Artwork a = artworkRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.badRequest("Cart contains a removed artwork"));
                title = a.getTitle();
                sellerId = a.getArtistId();
                unitPrice = a.getPriceZmw();
                itemType = OrderItem.ARTWORK;
            }
        }

        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
        BigDecimal fee = lineTotal.multiply(feePct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal roy = lineTotal.multiply(royPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal payout = lineTotal.subtract(fee).subtract(roy);
        return new Line(itemType, referenceId, sellerId, title, quantity, lineTotal, fee, roy, payout);
    }

    private Order createOrderAndItems(UUID buyerId, List<Line> lines) {
        BigDecimal subtotal = lines.stream().map(Line::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal platformFee = lines.stream().map(Line::fee).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal royalty = lines.stream().map(Line::roy).reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = new Order();
        order.setBuyerId(buyerId);
        order.setOrderNumber(generateOrderNumber());
        order.setStatus(Order.PENDING);
        order.setSubtotalZmw(subtotal);
        order.setPlatformFeeZmw(platformFee);
        order.setRoyaltyZmw(royalty);
        order.setTotalZmw(subtotal);
        order.setPaymentProvider("zynlepay");
        order = orderRepository.save(order);

        for (Line l : lines) {
            OrderItem item = new OrderItem();
            item.setOrderId(order.getId());
            item.setItemType(l.itemType());
            item.setReferenceId(l.referenceId());
            item.setSellerId(l.sellerId());
            if (OrderItem.ARTWORK.equals(l.itemType())) {
                item.setArtworkId(l.referenceId());
                item.setArtistId(l.sellerId());
            }
            item.setTitle(l.title());
            item.setUnitPriceZmw(l.lineTotal().divide(BigDecimal.valueOf(l.quantity()), 2, RoundingMode.HALF_UP));
            item.setQuantity(l.quantity());
            item.setLineTotalZmw(l.lineTotal());
            item.setPlatformFeeZmw(l.fee());
            item.setRoyaltyZmw(l.roy());
            item.setArtistPayoutZmw(l.payout());
            orderItemRepository.save(item);
        }
        return order;
    }

    private CheckoutResponse charge(Order order, CheckoutRequest req) {
        if ("momo".equals(req.paymentMethod())) {
            return payWithMomo(order, req);
        }
        return payWithCard(order, req);
    }

    private CheckoutResponse payWithMomo(Order order, CheckoutRequest req) {
        ZynlePayResult result = zynlePayClient.momoDeposit(req.phone(), order.getOrderNumber(), order.getTotalZmw());
        if (!result.isPending() && !result.isSuccess()) {
            order.setStatus(Order.CANCELLED);
            orderRepository.save(order);
            throw ApiException.badRequest(errorMessage(result));
        }
        order.setPaymentReference(result.transactionId());
        orderRepository.save(order);
        return new CheckoutResponse(order.getId(), order.getOrderNumber(), order.getTotalZmw(), "momo", null,
                "Check your phone for a USSD prompt to approve the payment of K" + order.getTotalZmw() + ".");
    }

    private CheckoutResponse payWithCard(Order order, CheckoutRequest req) {
        if (isBlank(req.firstName()) || isBlank(req.lastName()) || isBlank(req.address())
                || isBlank(req.city()) || isBlank(req.state()) || isBlank(req.zipCode())) {
            order.setStatus(Order.CANCELLED);
            orderRepository.save(order);
            throw ApiException.badRequest("Please fill in your billing details to pay by card");
        }
        User buyer = userRepository.findById(order.getBuyerId()).orElseThrow(() -> ApiException.notFound("Buyer not found"));
        String country = isBlank(req.country()) ? "ZMB" : req.country();

        ZynlePayResult result = zynlePayClient.cardDeposit(order.getOrderNumber(), order.getTotalZmw(),
                "ChrisEpic Arts order " + order.getOrderNumber(), req.firstName(), req.lastName(), req.address(),
                buyer.getEmail(), req.phone(), req.city(), req.state(), req.zipCode(), country);

        if ((!result.isPending() && !result.isSuccess()) || result.redirectUrl() == null) {
            order.setStatus(Order.CANCELLED);
            orderRepository.save(order);
            throw ApiException.badRequest(errorMessage(result));
        }
        order.setPaymentReference(result.transactionId());
        orderRepository.save(order);
        return new CheckoutResponse(order.getId(), order.getOrderNumber(), order.getTotalZmw(), "card", result.redirectUrl(), null);
    }

    private String errorMessage(ZynlePayResult result) {
        String description = result.description();
        return description != null ? description : "Payment could not be started. Please try again.";
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private String generateOrderNumber() {
        String date = DateTimeFormatter.ofPattern("yyyyMMdd").format(Instant.now().atZone(ZoneOffset.UTC));
        String suffix = UUID.randomUUID().toString().substring(0, 6);
        return "ORD-" + date + "-" + suffix;
    }
}
