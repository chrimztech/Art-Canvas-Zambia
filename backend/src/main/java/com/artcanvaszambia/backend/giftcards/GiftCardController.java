package com.artcanvaszambia.backend.giftcards;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.orders.CheckoutService;
import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import com.artcanvaszambia.backend.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class GiftCardController {
    private final GiftCardRepository giftCardRepository;
    private final CheckoutService checkoutService;

    public record GiftCardPurchaseRequest(
            @NotNull @DecimalMin("50") @DecimalMax("20000") BigDecimal amountZmw,
            @Email String recipientEmail,
            @Size(max = 120) String recipientName,
            @Size(max = 500) String message,
            @NotNull @Valid CheckoutRequest payment
    ) {
    }

    public record GiftCardDto(UUID id, String code, BigDecimal initialAmountZmw, BigDecimal balanceZmw, String recipientEmail,
                              String recipientName, String status, Instant createdAt) {
    }

    public record BalanceDto(String code, BigDecimal balanceZmw) {
    }

    @PostMapping("/api/gift-cards/checkout")
    public CheckoutResponse buy(@Valid @RequestBody GiftCardPurchaseRequest req) {
        return checkoutService.checkoutGiftCard(req.amountZmw(), req.recipientEmail(), req.recipientName(), req.message(), req.payment());
    }

    /** Gift cards the current user has bought (codes are only shown to the purchaser). */
    @GetMapping("/api/me/gift-cards")
    public List<GiftCardDto> mine() {
        return giftCardRepository.findByPurchaserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()).stream()
                .map(g -> new GiftCardDto(g.getId(), GiftCard.ACTIVE.equals(g.getStatus()) ? g.getCode() : null,
                        g.getInitialAmountZmw(), g.getBalanceZmw(), g.getRecipientEmail(), g.getRecipientName(),
                        g.getStatus(), g.getCreatedAt()))
                .toList();
    }

    /** Check a code's remaining balance (signed-in users only, to slow down guessing). */
    @GetMapping("/api/gift-cards/{code}/balance")
    public BalanceDto balance(@PathVariable String code) {
        GiftCard g = giftCardRepository.findByCodeIgnoreCase(code.trim())
                .filter(x -> GiftCard.ACTIVE.equals(x.getStatus()))
                .orElseThrow(() -> ApiException.notFound("Gift card not found"));
        return new BalanceDto(g.getCode(), g.getBalanceZmw());
    }
}
