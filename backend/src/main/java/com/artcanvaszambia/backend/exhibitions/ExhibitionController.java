package com.artcanvaszambia.backend.exhibitions;

import com.artcanvaszambia.backend.exhibitions.dto.ExhibitionDto;
import com.artcanvaszambia.backend.exhibitions.dto.ExhibitionRequest;
import com.artcanvaszambia.backend.exhibitions.dto.TicketDto;
import com.artcanvaszambia.backend.exhibitions.dto.TicketRequest;
import com.artcanvaszambia.backend.orders.CheckoutService;
import com.artcanvaszambia.backend.orders.OrderItem;
import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ExhibitionController {
    private final ExhibitionService exhibitionService;
    private final CheckoutService checkoutService;

    @GetMapping("/api/exhibitions")
    public List<ExhibitionDto> list() {
        return exhibitionService.listPublished();
    }

    @GetMapping("/api/exhibitions/{slug}")
    public ExhibitionDto get(@PathVariable String slug) {
        return exhibitionService.getBySlug(slug);
    }

    @GetMapping("/api/me/exhibitions")
    public List<ExhibitionDto> mine() {
        return exhibitionService.mine();
    }

    @PostMapping("/api/exhibitions")
    public ExhibitionDto create(@Valid @RequestBody ExhibitionRequest req) {
        return exhibitionService.create(req);
    }

    @PutMapping("/api/exhibitions/{id}")
    public ExhibitionDto update(@PathVariable UUID id, @Valid @RequestBody ExhibitionRequest req) {
        return exhibitionService.update(id, req);
    }

    @DeleteMapping("/api/exhibitions/{id}")
    public void delete(@PathVariable UUID id) {
        exhibitionService.delete(id);
    }

    @PostMapping("/api/exhibitions/{id}/tickets")
    public void bookTicket(@PathVariable UUID id, @Valid @RequestBody TicketRequest req) {
        exhibitionService.bookTicket(id, req.quantity());
    }

    @PostMapping("/api/exhibitions/{id}/checkout")
    public CheckoutResponse checkout(@PathVariable UUID id, @RequestParam(defaultValue = "1") int quantity,
                                      @Valid @RequestBody CheckoutRequest req) {
        return checkoutService.checkoutSingleItem(OrderItem.EXHIBITION, id, quantity, req);
    }

    @PostMapping("/api/exhibitions/tickets/{id}/check-in")
    public TicketDto checkIn(@PathVariable UUID id) {
        return exhibitionService.checkInTicket(id);
    }

    @GetMapping("/api/me/tickets")
    public List<TicketDto> myTickets() {
        return exhibitionService.myTickets();
    }
}
