package com.artcanvaszambia.backend.offers;

import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class OfferController {
    private final OfferService offerService;

    @PostMapping("/api/offers")
    public OfferService.OfferDto make(@RequestBody OfferService.MakeOfferRequest req) {
        return offerService.make(req);
    }

    @GetMapping("/api/me/offers")
    public List<OfferService.OfferDto> mine() {
        return offerService.asBuyer();
    }

    @GetMapping("/api/me/offers/received")
    public List<OfferService.OfferDto> received() {
        return offerService.asArtist();
    }

    @PostMapping("/api/offers/{id}/respond")
    public OfferService.OfferDto respond(@PathVariable UUID id, @RequestBody OfferService.RespondRequest req) {
        return offerService.respond(id, req);
    }

    @PostMapping("/api/offers/{id}/accept-counter")
    public OfferService.OfferDto acceptCounter(@PathVariable UUID id) {
        return offerService.acceptCounter(id);
    }

    @PostMapping("/api/offers/{id}/withdraw")
    public OfferService.OfferDto withdraw(@PathVariable UUID id) {
        return offerService.withdraw(id);
    }

    @PostMapping("/api/offers/{id}/checkout")
    public CheckoutResponse checkout(@PathVariable UUID id, @Valid @RequestBody CheckoutRequest req) {
        return offerService.checkout(id, req);
    }
}
