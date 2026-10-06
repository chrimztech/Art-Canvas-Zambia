package com.artcanvaszambia.backend.payouts;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.orders.Order;
import com.artcanvaszambia.backend.orders.OrderItem;
import com.artcanvaszambia.backend.orders.OrderItemRepository;
import com.artcanvaszambia.backend.orders.OrderRepository;
import com.artcanvaszambia.backend.orders.PlatformSettings;
import com.artcanvaszambia.backend.orders.PlatformSettingsRepository;
import com.artcanvaszambia.backend.payments.LencoClient;
import com.artcanvaszambia.backend.payments.LencoResult;
import com.artcanvaszambia.backend.payments.PaymentProviders;
import com.artcanvaszambia.backend.payments.ZynlePayClient;
import com.artcanvaszambia.backend.payments.ZynlePayResult;
import com.artcanvaszambia.backend.payouts.dto.AvailableBalanceDto;
import com.artcanvaszambia.backend.payouts.dto.CreatePayoutRequest;
import com.artcanvaszambia.backend.payouts.dto.PayoutRequestDto;
import com.artcanvaszambia.backend.payouts.dto.PlatformBalanceDto;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PayoutService {
    private final PayoutRequestRepository payoutRequestRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final ProfileRepository profileRepository;
    private final PlatformSettingsRepository platformSettingsRepository;
    private final ZynlePayClient zynlePayClient;
    private final LencoClient lencoClient;
    private final PaymentProviders paymentProviders;
    private final com.artcanvaszambia.backend.notifications.NotificationService notificationService;

    private static final Set<String> PAID_ORDER_STATUSES = Set.of(Order.PAID, Order.FULFILLED);
    private static final Set<String> RESERVED_PAYOUT_STATUSES = Set.of(
            PayoutRequest.REQUESTED, PayoutRequest.APPROVED, PayoutRequest.PROCESSING, PayoutRequest.PAID);

    public AvailableBalanceDto availableBalance(UUID sellerId) {
        List<OrderItem> items = orderItemRepository.findBySellerIdOrderByCreatedAtDesc(sellerId);
        var orderIds = items.stream().map(OrderItem::getOrderId).distinct().toList();
        var orders = orderRepository.findAllById(orderIds);
        var paidOrderIds = orders.stream().filter(o -> PAID_ORDER_STATUSES.contains(o.getStatus()))
                .map(Order::getId).collect(java.util.stream.Collectors.toSet());

        BigDecimal totalEarned = items.stream()
                .filter(i -> paidOrderIds.contains(i.getOrderId()) && i.getRefundedAt() == null)
                .map(OrderItem::getArtistPayoutZmw)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal alreadyPaidOut = payoutRequestRepository.findByArtistIdOrderByCreatedAtDesc(sellerId).stream()
                .filter(p -> RESERVED_PAYOUT_STATUSES.contains(p.getStatus()))
                .map(PayoutRequest::getAmountZmw)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new AvailableBalanceDto(totalEarned, alreadyPaidOut, totalEarned.subtract(alreadyPaidOut));
    }

    @Transactional
    public PayoutRequestDto create(CreatePayoutRequest req) {
        UUID artistId = SecurityUtils.currentUserId();
        Profile profile = profileRepository.findById(artistId).orElse(null);

        String method = req.method() != null && !req.method().isBlank() ? req.method()
                : profile != null ? profile.getPayoutMethod() : null;
        String phone = req.phone() != null && !req.phone().isBlank() ? req.phone()
                : profile != null ? profile.getPayoutPhone() : null;
        String bankName = req.bankName() != null && !req.bankName().isBlank() ? req.bankName()
                : profile != null ? profile.getPayoutBankName() : null;
        String receiverId = req.receiverId() != null && !req.receiverId().isBlank() ? req.receiverId()
                : profile != null ? profile.getPayoutReceiverId() : null;

        if (!"momo".equals(method) && !"bank".equals(method)) {
            throw ApiException.badRequest("Unknown payout method");
        }
        if ("momo".equals(method) && (phone == null || phone.isBlank())) {
            throw ApiException.badRequest("A phone number is required for mobile money payouts");
        }
        if ("bank".equals(method) && (bankName == null || bankName.isBlank()
                || receiverId == null || receiverId.isBlank())) {
            throw ApiException.badRequest("Bank name and account number are required for bank payouts");
        }
        BigDecimal available = availableBalance(artistId).availableBalance();
        if (req.amountZmw().compareTo(available) > 0) {
            throw ApiException.badRequest("Requested amount exceeds your available balance of K" + available);
        }

        PayoutRequest p = new PayoutRequest();
        p.setArtistId(artistId);
        p.setPayeeType(PayoutRequest.PAYEE_SELLER);
        p.setAmountZmw(req.amountZmw());
        p.setMethod(method);
        p.setPhone(phone);
        p.setBankName(bankName);
        p.setReceiverId(receiverId);
        p.setReferenceNo(generateReferenceNo());
        p.setStatus(PayoutRequest.REQUESTED);
        payoutRequestRepository.save(p);
        return toDto(p);
    }

    public PlatformBalanceDto availablePlatformBalance(String payeeType) {
        validatePlatformPayeeType(payeeType);
        List<Order> paidOrders = orderRepository.findByStatusIn(PAID_ORDER_STATUSES);
        List<OrderItem> items = orderItemRepository.findByOrderIdIn(paidOrders.stream().map(Order::getId).toList());

        BigDecimal totalEarned = items.stream()
                .filter(i -> i.getRefundedAt() == null)
                .map(PayoutRequest.PAYEE_DEVELOPER.equals(payeeType) ? OrderItem::getRoyaltyZmw : OrderItem::getPlatformFeeZmw)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal alreadyPaidOut = payoutRequestRepository.findByPayeeTypeOrderByCreatedAtDesc(payeeType).stream()
                .filter(p -> RESERVED_PAYOUT_STATUSES.contains(p.getStatus()))
                .map(PayoutRequest::getAmountZmw)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new PlatformBalanceDto(payeeType, totalEarned, alreadyPaidOut, totalEarned.subtract(alreadyPaidOut));
    }

    @Transactional
    public PayoutRequestDto createPlatformPayout(String payeeType) {
        validatePlatformPayeeType(payeeType);
        PlatformSettings settings = platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new);

        String method;
        String phone;
        String bankName;
        String receiverId;
        if (PayoutRequest.PAYEE_DEVELOPER.equals(payeeType)) {
            method = settings.getDeveloperPayoutMethod();
            phone = settings.getDeveloperPayoutPhone();
            bankName = settings.getDeveloperPayoutBankName();
            receiverId = settings.getDeveloperPayoutReceiverId();
        } else {
            method = settings.getOwnerPayoutMethod();
            phone = settings.getOwnerPayoutPhone();
            bankName = settings.getOwnerPayoutBankName();
            receiverId = settings.getOwnerPayoutReceiverId();
        }
        if (!"momo".equals(method) && !"bank".equals(method)) {
            throw ApiException.badRequest("Configure a payout account for this recipient first");
        }

        BigDecimal available = availablePlatformBalance(payeeType).availableBalance();
        if (available.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("There's no available balance to withdraw");
        }

        PayoutRequest p = new PayoutRequest();
        p.setPayeeType(payeeType);
        p.setAmountZmw(available);
        p.setMethod(method);
        p.setPhone(phone);
        p.setBankName(bankName);
        p.setReceiverId(receiverId);
        p.setReferenceNo(generateReferenceNo());
        p.setStatus(PayoutRequest.REQUESTED);
        payoutRequestRepository.save(p);
        return toDto(p);
    }

    private void validatePlatformPayeeType(String payeeType) {
        if (!PayoutRequest.PAYEE_DEVELOPER.equals(payeeType) && !PayoutRequest.PAYEE_OWNER.equals(payeeType)) {
            throw ApiException.badRequest("Unknown payee type: " + payeeType);
        }
    }

    public List<PayoutRequestDto> mine() {
        return payoutRequestRepository.findByArtistIdOrderByCreatedAtDesc(SecurityUtils.currentUserId())
                .stream().map(this::toDto).toList();
    }

    public List<PayoutRequestDto> adminList() {
        return payoutRequestRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional
    public PayoutRequestDto approve(UUID id) {
        PayoutRequest p = payoutRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Payout request not found"));
        if (!PayoutRequest.REQUESTED.equals(p.getStatus())) {
            throw ApiException.badRequest("Only requested payouts can be approved");
        }
        if (PaymentProviders.LENCO.equals(paymentProviders.active())) {
            return approveViaLenco(p);
        }
        ZynlePayResult result = "momo".equals(p.getMethod())
                ? zynlePayClient.momoWithdraw(p.getPhone(), p.getReferenceNo(), p.getAmountZmw())
                : zynlePayClient.walletToBank(p.getReceiverId(), p.getBankName(), p.getReferenceNo(),
                        p.getAmountZmw(), "ChrisEpic Arts artist payout " + p.getReferenceNo());

        if (result.isPending() || result.isSuccess()) {
            p.setStatus(PayoutRequest.PROCESSING);
            p.setTransactionId(result.transactionId());
        } else {
            p.setStatus(PayoutRequest.FAILED);
            p.setAdminNote(result.description() != null ? result.description() : "Payout could not be started");
        }
        payoutRequestRepository.save(p);
        notificationService.payoutUpdated(p);
        return toDto(p);
    }

    private PayoutRequestDto approveViaLenco(PayoutRequest p) {
        String narration = "ChrisEpic Arts payout " + p.getReferenceNo();
        // Gateway/validation errors propagate and leave the payout requested so an admin can retry or reject.
        LencoResult result;
        if ("momo".equals(p.getMethod())) {
            String phone = PaymentProviders.localPhone(p.getPhone());
            result = lencoClient.transferToMobileMoney(p.getReferenceNo(), p.getAmountZmw(), phone,
                    PaymentProviders.operatorFor(phone), narration);
        } else {
            String bankId = lencoBankId(p.getBankName());
            if (bankId == null) {
                p.setStatus(PayoutRequest.FAILED);
                p.setAdminNote("Bank \"" + p.getBankName() + "\" isn't recognised. Please request again choosing your bank from the list.");
                payoutRequestRepository.save(p);
                return toDto(p);
            }
            result = lencoClient.transferToBankAccount(p.getReferenceNo(), p.getAmountZmw(), p.getReceiverId(), bankId, narration);
        }
        if (result.isFailed()) {
            p.setStatus(PayoutRequest.FAILED);
            p.setAdminNote(result.failureReason());
        } else {
            p.setStatus(result.isSuccessful() ? PayoutRequest.PAID : PayoutRequest.PROCESSING);
            p.setTransactionId(result.lencoReference());
        }
        payoutRequestRepository.save(p);
        notificationService.payoutUpdated(p);
        return toDto(p);
    }

    /** Lenco needs its own bank id; match the seller's bank name against Lenco's Zambian bank list. */
    private String lencoBankId(String bankName) {
        if (bankName == null || bankName.isBlank()) return null;
        String wanted = bankName.trim().toLowerCase();
        var banks = lencoClient.banks();
        return banks.stream().filter(b -> b.get("name").equalsIgnoreCase(wanted)).map(b -> b.get("id")).findFirst()
                .orElseGet(() -> banks.stream().filter(b -> b.get("name").toLowerCase().contains(wanted)
                                || wanted.contains(b.get("name").toLowerCase()))
                        .map(b -> b.get("id")).findFirst().orElse(null));
    }

    @Transactional
    public PayoutRequestDto reject(UUID id, String note) {
        PayoutRequest p = payoutRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Payout request not found"));
        if (!PayoutRequest.REQUESTED.equals(p.getStatus())) {
            throw ApiException.badRequest("Only requested payouts can be rejected");
        }
        p.setStatus(PayoutRequest.REJECTED);
        p.setAdminNote(note);
        payoutRequestRepository.save(p);
        notificationService.payoutUpdated(p);
        return toDto(p);
    }

    private String generateReferenceNo() {
        String date = DateTimeFormatter.ofPattern("yyyyMMdd").format(Instant.now().atZone(ZoneOffset.UTC));
        String suffix = UUID.randomUUID().toString().substring(0, 6);
        return "PAY-" + date + "-" + suffix;
    }

    private PayoutRequestDto toDto(PayoutRequest p) {
        Profile profile = p.getArtistId() != null ? profileRepository.findById(p.getArtistId()).orElse(null) : null;
        return new PayoutRequestDto(p.getId(), p.getArtistId(), profile != null ? profile.getDisplayName() : null,
                p.getPayeeType(), p.getAmountZmw(), p.getMethod(), p.getPhone(), p.getBankName(), p.getReceiverId(),
                p.getReferenceNo(), p.getStatus(), p.getAdminNote(), p.getCreatedAt());
    }
}
