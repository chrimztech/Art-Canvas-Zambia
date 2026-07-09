package com.artcanvaszambia.backend.orders;

import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import com.artcanvaszambia.backend.orders.dto.OrderDetailDto;
import com.artcanvaszambia.backend.orders.dto.OrderSummaryDto;
import com.artcanvaszambia.backend.orders.dto.SaleDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class OrderController {
    private final CheckoutService checkoutService;
    private final OrderService orderService;

    @PostMapping("/api/checkout")
    public CheckoutResponse checkout(@Valid @RequestBody CheckoutRequest req) {
        return checkoutService.checkout(req);
    }

    @GetMapping("/api/me/orders")
    public List<OrderSummaryDto> mine() {
        return orderService.mine();
    }

    @GetMapping("/api/orders/{id}")
    public OrderDetailDto get(@PathVariable UUID id) {
        return orderService.get(id);
    }

    @PostMapping("/api/orders/{id}/sync-status")
    public OrderDetailDto syncStatus(@PathVariable UUID id) {
        return orderService.syncStatus(id);
    }

    @GetMapping("/api/me/sales")
    public List<SaleDto> mySales() {
        return orderService.mySales();
    }
}
