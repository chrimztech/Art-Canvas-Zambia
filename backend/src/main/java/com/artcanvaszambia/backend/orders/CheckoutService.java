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
import com.artcanvaszambia.backend.coupons.Coupon;
import com.artcanvaszambia.backend.coupons.CouponRepository;
import com.artcanvaszambia.backend.exhibitions.Exhibition;
import com.artcanvaszambia.backend.exhibitions.ExhibitionRepository;
import com.artcanvaszambia.backend.exhibitions.ExhibitionTicketRepository;
import com.artcanvaszambia.backend.giftcards.GiftCard;
import com.artcanvaszambia.backend.giftcards.GiftCardRepository;
import com.artcanvaszambia.backend.offers.Offer;
import com.artcanvaszambia.backend.orders.dto.CheckoutQuote;
import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import com.artcanvaszambia.backend.orders.dto.QuoteRequest;
import com.artcanvaszambia.backend.payments.LencoClient;
import com.artcanvaszambia.backend.payments.LencoResult;
import com.artcanvaszambia.backend.payments.PaymentProviders;
import com.artcanvaszambia.backend.payments.ZynlePayClient;
import com.artcanvaszambia.backend.payments.ZynlePayResult;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.supplies.Supply;
import com.artcanvaszambia.backend.supplies.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Turns a cart (or a single class/ticket/commission/offer/gift card) into an order and starts payment.
 *
 * <p>Every path runs the same pricing pipeline: list price (or accepted-offer price) per line,
 * plus delivery fees, minus coupon discounts, then platform fee and developer royalty on the
 * discounted amount. The seller's payout is the discounted amount minus fees, plus the full
 * delivery fee. A gift card then pays part (or all) of the total; the platform funds that part.
 */
@Service
@RequiredArgsConstructor
public class CheckoutService {
    /** Enrollment/ticket statuses that hold a seat. */
    public static final List<String> SEAT_HOLDING_STATUSES = List.of("paid", "attended", "used");

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
    private final ProfileRepository profileRepository;
    private final ZynlePayClient zynlePayClient;
    private final LencoClient lencoClient;
    private final PaymentProviders paymentProviders;
    private final OrderFulfillmentService orderFulfillmentService;
    private final GiftCardRepository giftCardRepository;
    private final CouponRepository couponRepository;

    /** One order line as it moves through pricing. */
    private static final class Line {
        String itemType;
        UUID referenceId;
        UUID sellerId;
        String title;
        int quantity;
        BigDecimal lineTotal;
        BigDecimal shipping = BigDecimal.ZERO;
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal fee = BigDecimal.ZERO;
        BigDecimal roy = BigDecimal.ZERO;
        BigDecimal payout = BigDecimal.ZERO;
        UUID offerId;

        BigDecimal net() {
            return lineTotal.subtract(discount);
        }
    }

    /** Result of pricing a set of lines with optional coupon and gift card. */
    private record Priced(List<Line> lines, BigDecimal subtotal, BigDecimal discount, BigDecimal shipping,
                          Coupon coupon, String couponMessage, GiftCard giftCard, String giftCardMessage,
                          BigDecimal giftCardApplied, BigDecimal total) {
    }

    // =====================================================================
    // Entry points
    // =====================================================================

    /** Cart preview: totals with delivery, coupon and gift card, without creating anything. */
    public CheckoutQuote quote(QuoteRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        List<CartItem> cart = cartItemRepository.findByUserId(buyerId);
        boolean delivery = !"pickup".equals(req.deliveryMethod());
        List<Line> lines = new ArrayList<>();
        for (CartItem c : cart) {
            lines.add(priceLine(c.getItemType(), c.getItemId(), c.getQuantity(), buyerId, delivery, null));
        }
        Priced p = price(lines, req.couponCode(), req.giftCardCode(), false);
        return new CheckoutQuote(
                p.lines().stream().map(l -> new CheckoutQuote.Line(l.itemType, l.referenceId, l.title, l.quantity,
                        l.lineTotal, l.discount, l.shipping)).toList(),
                p.subtotal(), p.discount(), p.shipping(), p.giftCardApplied(), p.total(),
                p.coupon() != null ? p.coupon().getCode() : null, p.couponMessage(),
                p.giftCard() != null ? p.giftCard().getCode() : null,
                p.giftCard() != null ? p.giftCard().getBalanceZmw() : null, p.giftCardMessage());
    }

    // Deliberately not @Transactional: the gateway call happens after the order and its items
    // are created, and a payment failure must still leave the order persisted (as "cancelled")
    // rather than rolling back the whole checkout.
    public CheckoutResponse checkout(CheckoutRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        List<CartItem> cart = cartItemRepository.findByUserId(buyerId);
        if (cart.isEmpty()) {
            throw ApiException.badRequest("Cart is empty");
        }
        // Every cart line holds a physical good, so delivery details are always needed here.
        Map<String, String> shipping = shippingDetails(req);
        boolean delivery = "delivery".equals(shipping.get("method"));
        List<Line> lines = new ArrayList<>();
        for (CartItem c : cart) {
            lines.add(priceLine(c.getItemType(), c.getItemId(), c.getQuantity(), buyerId, delivery, null));
        }
        Priced priced = price(lines, req.couponCode(), req.giftCardCode(), true);
        validatePaymentInputs(req, priced.total());

        Order order = createOrder(buyerId, priced, shipping);
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

    /** Direct "buy now" for classes, exhibition tickets and accepted commission quotes. */
    public CheckoutResponse checkoutSingleItem(String itemType, UUID referenceId, int quantity, CheckoutRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        if (quantity < 1 || quantity > 20) {
            throw ApiException.badRequest("Quantity must be between 1 and 20");
        }
        Line line = priceLine(itemType, referenceId, quantity, buyerId, false, null);
        Priced priced = price(List.of(line), req.couponCode(), req.giftCardCode(), true);
        validatePaymentInputs(req, priced.total());
        return charge(createOrder(buyerId, priced, null), req);
    }

    /** Buys an artwork at the price agreed in an accepted offer (validated by OfferService). */
    public CheckoutResponse checkoutOffer(Offer offer, CheckoutRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        Map<String, String> shipping = shippingDetails(req);
        Line line = priceLine(OrderItem.ARTWORK, offer.getArtworkId(), 1, buyerId,
                "delivery".equals(shipping.get("method")), offer.getAmountZmw());
        line.offerId = offer.getId();
        Priced priced = price(List.of(line), req.couponCode(), req.giftCardCode(), true);
        validatePaymentInputs(req, priced.total());
        return charge(createOrder(buyerId, priced, shipping), req);
    }

    /** Buys a gift card. The money is platform revenue until the card is spent. */
    public CheckoutResponse checkoutGiftCard(BigDecimal amountZmw, String recipientEmail, String recipientName,
                                             String message, CheckoutRequest req) {
        UUID buyerId = SecurityUtils.currentUserId();
        if (amountZmw.compareTo(BigDecimal.valueOf(50)) < 0 || amountZmw.compareTo(BigDecimal.valueOf(20000)) > 0) {
            throw ApiException.badRequest("Gift card amount must be between K50 and K20,000");
        }
        if (!isBlank(req.giftCardCode())) {
            throw ApiException.badRequest("Gift cards can't be bought with another gift card");
        }
        validatePaymentInputs(req, amountZmw);
        BigDecimal amount = amountZmw.setScale(2, RoundingMode.HALF_UP);

        Line line = new Line();
        line.itemType = OrderItem.GIFT_CARD;
        line.title = "Gift card" + (!isBlank(recipientName) ? " for " + recipientName.trim() : "");
        line.quantity = 1;
        line.lineTotal = amount;
        Priced priced = new Priced(List.of(line), amount, BigDecimal.ZERO, BigDecimal.ZERO, null, null, null, null,
                BigDecimal.ZERO, amount);
        Order order = createOrder(buyerId, priced, null);

        OrderItem item = orderItemRepository.findByOrderId(order.getId()).get(0);
        GiftCard gc = new GiftCard();
        gc.setCode(uniqueGiftCardCode());
        gc.setInitialAmountZmw(amount);
        gc.setBalanceZmw(amount);
        gc.setPurchaserId(buyerId);
        gc.setRecipientEmail(isBlank(recipientEmail) ? null : recipientEmail.trim());
        gc.setRecipientName(isBlank(recipientName) ? null : recipientName.trim());
        gc.setMessage(isBlank(message) ? null : message.trim());
        gc.setOrderItemId(item.getId());
        gc.setStatus(GiftCard.PENDING);
        giftCardRepository.save(gc);
        item.setReferenceId(gc.getId());
        orderItemRepository.save(item);
        return charge(order, req);
    }

    // =====================================================================
    // Pricing
    // =====================================================================

    /** Validates one line and sets its list price (or offer price) and delivery fee. */
    private Line priceLine(String itemType, UUID referenceId, int quantity, UUID buyerId, boolean delivery,
                           BigDecimal priceOverride) {
        Line line = new Line();
        line.referenceId = referenceId;
        BigDecimal unitPrice;
        switch (itemType) {
            case OrderItem.SUPPLY -> {
                Supply s = supplyRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.badRequest("Cart contains a removed supply"));
                CartService.requireSupplyAvailable(s, buyerId, quantity);
                requireNotOnVacation(s.getSellerId(), s.getName());
                line.title = s.getName();
                line.sellerId = s.getSellerId();
                unitPrice = s.getPriceZmw();
                if (delivery) line.shipping = nz(s.getShippingFeeZmw());
            }
            case OrderItem.CLASS -> {
                ClassEntity c = classRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.notFound("Class not found"));
                requireClassBookable(c, buyerId);
                line.title = c.getTitle();
                line.sellerId = c.getInstructorId();
                unitPrice = c.getPriceZmw();
                quantity = 1;
            }
            case OrderItem.EXHIBITION -> {
                Exhibition e = exhibitionRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.notFound("Exhibition not found"));
                requireExhibitionBookable(e, quantity);
                line.title = e.getTitle();
                line.sellerId = e.getOrganizerId();
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
                line.title = "Commission: " + c.getTitle();
                line.sellerId = c.getArtistId();
                unitPrice = c.getQuotedPriceZmw();
                quantity = 1;
            }
            default -> {
                Artwork a = artworkRepository.findById(referenceId)
                        .orElseThrow(() -> ApiException.badRequest("Cart contains a removed artwork"));
                CartService.requireArtworkAvailable(a, buyerId, quantity);
                requireNotOnVacation(a.getArtistId(), a.getTitle());
                line.title = a.getTitle();
                line.sellerId = a.getArtistId();
                unitPrice = priceOverride != null ? priceOverride : a.getPriceZmw();
                itemType = OrderItem.ARTWORK;
                if (delivery) line.shipping = nz(a.getShippingFeeZmw());
            }
        }
        line.itemType = itemType;
        line.quantity = quantity;
        line.lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);
        return line;
    }

    /**
     * Applies the coupon (strict = reject invalid codes; otherwise report why they didn't apply),
     * computes fees and payouts per line, then applies gift-card credit to the total.
     */
    private Priced price(List<Line> lines, String couponCode, String giftCardCode, boolean strict) {
        BigDecimal subtotal = sum(lines.stream().map(l -> l.lineTotal).toList());
        BigDecimal shipping = sum(lines.stream().map(l -> l.shipping).toList());

        Coupon coupon = null;
        String couponMessage = null;
        if (!isBlank(couponCode)) {
            Coupon c = couponRepository.findByCodeIgnoreCase(couponCode.trim()).orElse(null);
            String problem = c == null ? "That discount code doesn't exist" : c.unusableReason(Instant.now());
            List<Line> eligible = c == null ? List.of() : lines.stream()
                    .filter(l -> !OrderItem.GIFT_CARD.equals(l.itemType))
                    .filter(l -> c.getSellerId() == null || c.getSellerId().equals(l.sellerId))
                    .toList();
            BigDecimal eligibleTotal = sum(eligible.stream().map(l -> l.lineTotal).toList());
            if (problem == null && eligible.isEmpty()) {
                problem = "This code doesn't apply to anything in your order";
            }
            if (problem == null && c.getMinOrderZmw() != null && eligibleTotal.compareTo(c.getMinOrderZmw()) < 0) {
                problem = "Spend at least K" + c.getMinOrderZmw().stripTrailingZeros().toPlainString() + " on eligible items to use this code";
            }
            if (problem != null) {
                if (strict) throw ApiException.badRequest(problem);
                couponMessage = problem;
            } else {
                coupon = c;
                BigDecimal discountTotal = c.getPercentOff() != null
                        ? eligibleTotal.multiply(c.getPercentOff()).divide(HUNDRED, 2, RoundingMode.HALF_UP)
                        : c.getAmountOffZmw().min(eligibleTotal);
                distribute(eligible, discountTotal, eligibleTotal);
            }
        }

        BigDecimal feePct = platformFeePercent();
        BigDecimal royPct = developerRoyaltyPercent();
        // Seller codes are funded by the seller (fees and payout on the discounted price); site-wide
        // codes are funded by the platform: the seller is paid as if at full price and the discount
        // comes out of the platform fee (which may go negative for a generous promotion).
        boolean platformFunded = coupon != null && coupon.getSellerId() == null;
        for (Line l : lines) {
            if (OrderItem.GIFT_CARD.equals(l.itemType)) {
                continue; // gift cards are platform revenue: no seller, fee or royalty
            }
            BigDecimal base = platformFunded ? l.lineTotal : l.net();
            l.fee = base.multiply(feePct).divide(HUNDRED, 2, RoundingMode.HALF_UP);
            l.roy = base.multiply(royPct).divide(HUNDRED, 2, RoundingMode.HALF_UP);
            l.payout = base.subtract(l.fee).subtract(l.roy).add(l.shipping);
            if (platformFunded) {
                l.fee = l.fee.subtract(l.discount);
            }
        }

        BigDecimal discount = sum(lines.stream().map(l -> l.discount).toList());
        BigDecimal beforeGiftCard = subtotal.subtract(discount).add(shipping);

        GiftCard giftCard = null;
        String giftCardMessage = null;
        BigDecimal giftCardApplied = BigDecimal.ZERO;
        if (!isBlank(giftCardCode)) {
            GiftCard g = giftCardRepository.findByCodeIgnoreCase(giftCardCode.trim()).orElse(null);
            String problem = g == null || !GiftCard.ACTIVE.equals(g.getStatus()) ? "That gift card code isn't valid"
                    : g.getBalanceZmw().signum() <= 0 ? "This gift card has no balance left" : null;
            if (problem != null) {
                if (strict) throw ApiException.badRequest(problem);
                giftCardMessage = problem;
            } else {
                giftCard = g;
                giftCardApplied = g.getBalanceZmw().min(beforeGiftCard);
            }
        }
        return new Priced(lines, subtotal, discount, shipping, coupon, couponMessage, giftCard, giftCardMessage,
                giftCardApplied, beforeGiftCard.subtract(giftCardApplied));
    }

    /** Splits a discount across lines in proportion to their value; the last line absorbs rounding. */
    private static void distribute(List<Line> eligible, BigDecimal discountTotal, BigDecimal eligibleTotal) {
        BigDecimal remaining = discountTotal;
        for (int i = 0; i < eligible.size(); i++) {
            Line l = eligible.get(i);
            BigDecimal share = i == eligible.size() - 1
                    ? remaining
                    : discountTotal.multiply(l.lineTotal).divide(eligibleTotal, 2, RoundingMode.HALF_UP);
            share = share.min(l.lineTotal);
            l.discount = share;
            remaining = remaining.subtract(share);
        }
    }

    private Order createOrder(UUID buyerId, Priced p, Map<String, String> shipping) {
        Order order = new Order();
        order.setBuyerId(buyerId);
        order.setOrderNumber(generateOrderNumber());
        order.setStatus(Order.PENDING);
        order.setSubtotalZmw(p.subtotal());
        order.setDiscountZmw(p.discount());
        order.setShippingZmw(p.shipping());
        order.setPlatformFeeZmw(sum(p.lines().stream().map(l -> l.fee).toList()));
        order.setRoyaltyZmw(sum(p.lines().stream().map(l -> l.roy).toList()));
        order.setGiftCardZmw(p.giftCardApplied());
        order.setGiftCardId(p.giftCard() != null ? p.giftCard().getId() : null);
        order.setCouponCode(p.coupon() != null ? p.coupon().getCode() : null);
        order.setTotalZmw(p.total());
        order.setPaymentProvider(p.total().signum() == 0 ? "gift_card" : paymentProviders.active());
        order.setShippingAddress(shipping);
        order = orderRepository.save(order);

        for (Line l : p.lines()) {
            OrderItem item = new OrderItem();
            item.setOrderId(order.getId());
            item.setItemType(l.itemType);
            item.setReferenceId(l.referenceId);
            item.setSellerId(l.sellerId);
            if (OrderItem.ARTWORK.equals(l.itemType)) {
                item.setArtworkId(l.referenceId);
                item.setArtistId(l.sellerId);
            }
            item.setTitle(l.title);
            item.setUnitPriceZmw(l.lineTotal.divide(BigDecimal.valueOf(l.quantity), 2, RoundingMode.HALF_UP));
            item.setQuantity(l.quantity);
            item.setLineTotalZmw(l.lineTotal);
            item.setDiscountZmw(l.discount);
            item.setShippingZmw(l.shipping);
            item.setPlatformFeeZmw(l.fee);
            item.setRoyaltyZmw(l.roy);
            item.setArtistPayoutZmw(l.payout);
            item.setOfferId(l.offerId);
            orderItemRepository.save(item);
        }
        return order;
    }

    // =====================================================================
    // Availability rules (shared with free bookings)
    // =====================================================================

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

    private void requireNotOnVacation(UUID sellerId, String title) {
        Profile p = profileRepository.findById(sellerId).orElse(null);
        if (p != null && p.isVacationMode()) {
            throw ApiException.badRequest("The seller of “" + title + "” is away right now"
                    + (isBlank(p.getVacationMessage()) ? "" : ": " + p.getVacationMessage().trim()));
        }
    }

    // =====================================================================
    // Payment
    // =====================================================================

    private void validatePaymentInputs(CheckoutRequest req, BigDecimal total) {
        if (total.signum() == 0) {
            return; // fully covered by a gift card: nothing to charge
        }
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
        putIfPresent(shipping, "phone", !isBlank(req.shippingPhone()) ? req.shippingPhone() : req.phone());
        putIfPresent(shipping, "address", req.shippingAddress());
        putIfPresent(shipping, "city", req.shippingCity());
        putIfPresent(shipping, "notes", req.shippingNotes());
        return shipping;
    }

    private CheckoutResponse charge(Order order, CheckoutRequest req) {
        if (order.getTotalZmw().signum() == 0) {
            orderFulfillmentService.markPaid(order);
            return new CheckoutResponse(order.getId(), order.getOrderNumber(), order.getTotalZmw(), "gift_card", null,
                    "Paid in full with your gift card.", null);
        }
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

    // =====================================================================
    // Helpers
    // =====================================================================

    private BigDecimal platformFeePercent() {
        return platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new).getPlatformFeePercent();
    }

    private BigDecimal developerRoyaltyPercent() {
        return platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new).getDeveloperRoyaltyPercent();
    }

    private String uniqueGiftCardCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("GIFT-");
            for (int i = 0; i < 12; i++) {
                if (i > 0 && i % 4 == 0) sb.append('-');
                sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            }
            code = sb.toString();
        } while (giftCardRepository.existsByCode(code));
        return code;
    }

    private void putIfPresent(Map<String, String> map, String key, String value) {
        if (!isBlank(value)) map.put(key, value.trim());
    }

    private String errorMessage(ZynlePayResult result) {
        String description = result.description();
        return description != null ? description : "Payment could not be started. Please try again.";
    }

    private static BigDecimal sum(List<BigDecimal> values) {
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private String generateOrderNumber() {
        String date = DateTimeFormatter.ofPattern("yyyyMMdd").format(Instant.now().atZone(ZoneOffset.UTC));
        String suffix = UUID.randomUUID().toString().substring(0, 6);
        return "ORD-" + date + "-" + suffix;
    }
}
