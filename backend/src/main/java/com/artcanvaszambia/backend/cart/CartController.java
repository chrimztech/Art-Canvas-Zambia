package com.artcanvaszambia.backend.cart;

import com.artcanvaszambia.backend.cart.dto.AddToCartRequest;
import com.artcanvaszambia.backend.cart.dto.CartItemDto;
import com.artcanvaszambia.backend.cart.dto.UpdateCartItemRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {
    private final CartService cartService;

    @GetMapping
    public List<CartItemDto> list() {
        return cartService.list();
    }

    @PostMapping
    public void add(@Valid @RequestBody AddToCartRequest req) {
        cartService.add(req);
    }

    @PatchMapping("/{id}")
    public void updateQuantity(@PathVariable UUID id, @Valid @RequestBody UpdateCartItemRequest req) {
        cartService.updateQuantity(id, req.quantity());
    }

    @DeleteMapping("/{id}")
    public void remove(@PathVariable UUID id) {
        cartService.remove(id);
    }
}
