package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.cart.CartItem;
import com.artcanvaszambia.backend.cart.CartItemRepository;
import com.artcanvaszambia.backend.cart.CartService;
import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.classes.ClassEnrollmentRepository;
import com.artcanvaszambia.backend.classes.ClassEntity;
import com.artcanvaszambia.backend.classes.ClassRepository;
import com.artcanvaszambia.backend.commissions.Commission;
import com.artcanvaszambia.backend.commissions.CommissionRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.exhibitions.Exhibition;
import com.artcanvaszambia.backend.exhibitions.ExhibitionRepository;
import com.artcanvaszambia.backend.exhibitions.ExhibitionTicketRepository;
import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import com.artcanvaszambia.backend.payments.LencoClient;
import com.artcanvaszambia.backend.payments.LencoResult;
import com.artcanvaszambia.backend.payments.PaymentProviders;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckoutService {
    /** Enrollment/ticket statuses that hold a seat. */
    public static final List<String> SEAT_HOLDING_STATUSES = List.of("paid", "attended", "used");

    private final CartItemRepository cartItemRepository;
    private final ArtworkRepository artworkRepository;
    private final SupplyRepository supplyRepository;
    private final ClassRepository classRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final ExhibitionRepository exhibitionRepository;
    private final ExhibitionTicketRepository exhibitionTicketRepository;
    private final CommissionRepository commissionRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PlatformSettingsRepository platformSettingsRepository;
    private final UserRepository userRepository;
    private final ZynlePayClient zynlePayClient;
    private final LencoClient lencoClient;
    private final PaymentProviders paymentProviders;
    private final OrderFulfillmentService orderFulfillmentService;

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
        // Every cart line holds a physical good, so delivery details are always needed here.
        Map<String, String> shipping = shippingDetails(req);

        BigDecimal feePct = platformFeePercent();
        BigDecimal royPct = developerRoyaltyPercent();
        List<Line> lines = new ArrayList<>();
        for (CartItem c : cart) {
            lines.add(priceLine(c.getItemType(), c.getItemId(), c.getQuantity(), buyerId, feePct, royPct));
        }

        Order order = createOrderAndItems(buyerId, lines, shipping);
        CheckoutResponse response = charge(order, req);
        // Only empty the cart once the payment has actually been started; a declined
        // or unreachable payment leaves the buyer's cart intact so they can retry.
        // Widget payments (Lenco card) may still be abandoned in the browser, so their
        // items stay in the cart until fulfilment removes them on confirmed payment.
        if (response.widget() == null) {
            cartItemRepository.deleteByUserId(buyerId);
        }
        return response;
    }

    // Direct "buy now" checkout for single-item purchases (classes, exhibition tickets,
    // accepted commission quotes) that don't go through the cart.
    public CheckoutResponse checkoutSingleItem(String itemType, UUID referenceId, int quantity, CheckoutRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        validatePaymentInputs(req);
        if (quantity < 1 || quantity > 20) {
            throw ApiException.badRequest("Quantity must be between 1 and 20");
        }
        BigDecimal feePct = platformFeePercent();
        BigDecimal royPct = developerRoyaltyPercent();
        Line line = priceLine(itemType, referenceId, quantity, buyerId, feePct, royPct);
        Order order = createOrderAndItems(buyerId, List.of(line), null);
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

    private Map<String, String> shippingDetails(CheckoutRequest req) {
        String method = "pickup".equals(req.deliveryMethod()) ? "pickup" : "delivery";
        if ("delivery".equals(method) && (isBlank(req.shippingAddress()) || isBlank(req.shippingCity()))) {
            throw ApiException.badRequest("Please enter a delivery address and city");
        }
        Map<String, String> shipping = new LinkedHashMap<>();
        shipping.put("method", method);
        putIfPresent(shipping, "name", req.shippingName());
        shipping.put("phone", !isBlank(req.shippingPhone()) ? req.shippingPhone().trim() : req.phone().trim());
        putIfPresent(shipping, "address", req.shippingAddress());
        putIfPresent(shipping, "city", req.shippingCity());
        putIfPresent(shipping, "notes", req.shippingNotes());
        return shipping;
    }

    private void putIfPresent(Map<String, String> map, String key, String value) {
        if (!isBlank(value)) map.put(key, value.trim());
    }

    private BigDecimal platformFeePercent() {
        return platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new).getPlatformFeePercent();
    }

    private BigDecimal developerRoyaltyPercent() {
        return platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new).getDeveloperRoyaltyPercent();
    }

    private Line priceLine(String itemType, UUID referenceId, int quantity, UUID buyerId,
                           BigDecimal feePct, BigDecimal royPct) {
        String title;
        UUID sellerId;
        BigDecimal unitPrice;

        switch (itemType) {
            case OrderItem.SUPPLY -> {
                Supply s = supplyRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.badRequest("Cart contains a removed supply"));
                CartService.requireSupplyAvailable(s, buyerId, quantity);
                title = s.getName();
                sellerId = s.getSellerId();
                unitPrice = s.getPriceZmw();
            }
            case OrderItem.CLASS -> {
                ClassEntity c = classRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.notFound("Class not found"));
                requireClassBookable(c, buyerId);
                title = c.getTitle();
                sellerId = c.getInstructorId();
                unitPrice = c.getPriceZmw();
                quantity = 1;
            }
            case OrderItem.EXHIBITION -> {
                Exhibition e = exhibitionRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.notFound("Exhibition not found"));
                requireExhibitionBookable(e, quantity);
                title = e.getTitle();
                sellerId = e.getOrganizerId();
                unitPrice = e.getTicketPriceZmw();
            }
            case OrderItem.COMMISSION -> {
                Commission c = commissionRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.notFound("Commission not found"));
                if (!c.getCustomerId().equals(buyerId)) {
                    throw ApiException.forbidden("Only the customer can pay for this commission");
                }
                if (!Commission.QUOTED.equals(c.getStatus()) || c.getQuotedPriceZmw() == null || c.getArtistId() == null) {
                    throw ApiException.badRequest("This commission has no quote awaiting payment");
                }
                title = "Commission: " + c.getTitle();
                sellerId = c.getArtistId();
                unitPrice = c.getQuotedPriceZmw();
                quantity = 1;
            }
            default -> {
                Artwork a = artworkRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.badRequest("Cart contains a removed artwork"));
                CartService.requireArtworkAvailable(a, buyerId, quantity);
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

    /** Shared with free enrollment so paid and free bookings obey the same rules. */
    public void requireClassBookable(ClassEntity c, UUID studentId) {
        if (!ClassEntity.PUBLISHED.equals(c.getStatus())) {
            throw ApiException.badRequest("This class isn't open for enrollment");
        }
        if (c.getInstructorId().equals(studentId)) {
            throw ApiException.badRequest("You can't enroll in your own class");
        }
        if (c.getEndsAt() != null && c.getEndsAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("This class has already ended");
        }
        if (classEnrollmentRepository.existsByClassIdAndStudentIdAndStatusIn(c.getId(), studentId, SEAT_HOLDING_STATUSES)) {
            throw ApiException.conflict("You're already enrolled in this class");
        }
        long taken = classEnrollmentRepository.countByClassIdAndStatusIn(c.getId(), SEAT_HOLDING_STATUSES);
        if (taken >= c.getCapacity()) {
            throw ApiException.conflict("This class is fully booked");
        }
    }

    public void requireExhibitionBookable(Exhibition e, int quantity) {
        if (!Exhibition.PUBLISHED.equals(e.getStatus())) {
            throw ApiException.badRequest("Tickets for this exhibition aren't on sale");
        }
        if (e.getEndsAt() != null && e.getEndsAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("This exhibition has already ended");
        }
        if (e.getCapacity() != null) {
            long sold = exhibitionTicketRepository.sumQuantityByExhibitionIdAndStatusIn(e.getId(), SEAT_HOLDING_STATUSES);
            if (sold + quantity > e.getCapacity()) {
                long left = Math.max(e.getCapacity() - sold, 0);
                throw ApiException.conflict(left == 0 ? "This exhibition is sold out" : "Only " + left + " tickets left");
            }
        }
    }

    private Order createOrderAndItems(UUID buyerId, List<Line> lines, Map<String, String> shipping) {
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
        order.setPaymentProvider(paymentProviders.active());
        order.setShippingAddress(shipping);
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
        if (PaymentProviders.LENCO.equals(order.getPaymentProvider())) {
            return "momo".equals(req.paymentMethod()) ? lencoMomo(order, req) : lencoCard(order, req);
        }
        if ("momo".equals(req.paymentMethod())) {
            return payWithMomo(order, req);
        }
        return payWithCard(order, req);
    }

    /** Lenco mobile money: Lenco pushes an approval prompt to the customer's phone. */
    private CheckoutResponse lencoMomo(Order order, CheckoutRequest req) {
        String phone;
        String operator;
        try {
            phone = PaymentProviders.localPhone(req.phone());
            operator = PaymentProviders.resolveOperator(req.operator(), phone);
        } catch (ApiException ex) {
            cancel(order);
            throw ex;
        }
        LencoResult result;
        try {
            result = lencoClient.collectMobileMoney(order.getOrderNumber(), order.getTotalZmw(), phone, operator);
        } catch (ApiException ex) {
            cancel(order);
            throw ex;
        }
        if (result.isFailed()) {
            cancel(order);
            throw ApiException.badRequest(result.failureReason());
        }
        order.setPaymentReference(result.lencoReference());
        orderRepository.save(order);
        if (result.isSuccessful()) {
            orderFulfillmentService.markPaid(order);
        }
        String network = switch (operator) {
            case "mtn" -> "MTN MoMo";
            case "zamtel" -> "Zamtel Kwacha";
            default -> "Airtel Money";
        };
        return new CheckoutResponse(order.getId(), order.getOrderNumber(), order.getTotalZmw(), "momo", null,
                "Approve the " + network + " prompt on " + phone + " to pay K" + order.getTotalZmw() + ".", null);
    }

    /**
     * Lenco card: the browser opens Lenco's payment widget for this order's reference. Nothing is
     * trusted from the browser; the order is only marked paid after the server verifies the
     * collection with Lenco (status sync or signed webhook).
     */
    private CheckoutResponse lencoCard(Order order, CheckoutRequest req) {
        if (lencoClient.publicKey() == null || lencoClient.publicKey().isBlank()) {
            cancel(order);
            throw ApiException.badRequest("Card payments are not available right now. Please pay with mobile money.");
        }
        User buyer = userRepository.findById(order.getBuyerId()).orElseThrow(() -> ApiException.notFound("Buyer not found"));
        Map<String, Object> widget = new LinkedHashMap<>();
        widget.put("provider", PaymentProviders.LENCO);
        widget.put("scriptUrl", lencoClient.widgetUrl());
        widget.put("key", lencoClient.publicKey());
        widget.put("reference", order.getOrderNumber());
        widget.put("amount", order.getTotalZmw());
        widget.put("currency", "ZMW");
        widget.put("email", buyer.getEmail());
        widget.put("channels", List.of("card"));
        Map<String, String> customer = new LinkedHashMap<>();
        if (!isBlank(req.firstName())) customer.put("firstName", req.firstName().trim());
        if (!isBlank(req.lastName())) customer.put("lastName", req.lastName().trim());
        customer.put("phone", req.phone().trim());
        widget.put("customer", customer);
        return new CheckoutResponse(order.getId(), order.getOrderNumber(), order.getTotalZmw(), "card", null, null, widget);
    }

    private CheckoutResponse payWithMomo(Order order, CheckoutRequest req) {
        ZynlePayResult result;
        try {
            result = zynlePayClient.momoDeposit(req.phone(), order.getOrderNumber(), order.getTotalZmw());
        } catch (ApiException ex) {
            cancel(order);
            throw ex;
        }
        if (!result.isPending() && !result.isSuccess()) {
            cancel(order);
            throw ApiException.badRequest(errorMessage(result));
        }
        order.setPaymentReference(result.transactionId());
        orderRepository.save(order);
        return new CheckoutResponse(order.getId(), order.getOrderNumber(), order.getTotalZmw(), "momo", null,
                "Check your phone for a USSD prompt to approve the payment of K" + order.getTotalZmw() + ".", null);
    }

    private CheckoutResponse payWithCard(Order order, CheckoutRequest req) {
        if (isBlank(req.firstName()) || isBlank(req.lastName()) || isBlank(req.address())
                || isBlank(req.city()) || isBlank(req.state()) || isBlank(req.zipCode())) {
            cancel(order);
            throw ApiException.badRequest("Please fill in your billing details to pay by card");
        }
        User buyer = userRepository.findById(order.getBuyerId()).orElseThrow(() -> ApiException.notFound("Buyer not found"));
        String country = isBlank(req.country()) ? "ZMB" : req.country();

        ZynlePayResult result;
        try {
            result = zynlePayClient.cardDeposit(order.getOrderNumber(), order.getTotalZmw(),
                    "ChrisEpic Arts order " + order.getOrderNumber(), req.firstName(), req.lastName(), req.address(),
                    buyer.getEmail(), req.phone(), req.city(), req.state(), req.zipCode(), country);
        } catch (ApiException ex) {
            cancel(order);
            throw ex;
        }

        if ((!result.isPending() && !result.isSuccess()) || result.redirectUrl() == null) {
            cancel(order);
            throw ApiException.badRequest(errorMessage(result));
        }
        order.setPaymentReference(result.transactionId());
        orderRepository.save(order);
        return new CheckoutResponse(order.getId(), order.getOrderNumber(), order.getTotalZmw(), "card", result.redirectUrl(), null, null);
    }

    private void cancel(Order order) {
        order.setStatus(Order.CANCELLED);
        orderRepository.save(order);
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
