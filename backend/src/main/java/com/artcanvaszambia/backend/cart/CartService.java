package com.artcanvaszambia.backend.cart;

import com.artcanvaszambia.backend.cart.dto.AddToCartRequest;
import com.artcanvaszambia.backend.cart.dto.CartItemDto;
import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.supplies.Supply;
import com.artcanvaszambia.backend.supplies.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {
    private final CartItemRepository cartItemRepository;
    private final ArtworkRepository artworkRepository;
    private final SupplyRepository supplyRepository;

    public List<CartItemDto> list() {
        UUID userId = SecurityUtils.currentUserId();
        List<CartItem> items = cartItemRepository.findByUserId(userId);

        List<UUID> artworkIds = items.stream().filter(i -> CartItem.ARTWORK.equals(i.getItemType()))
                .map(CartItem::getItemId).toList();
        List<UUID> supplyIds = items.stream().filter(i -> CartItem.SUPPLY.equals(i.getItemType()))
                .map(CartItem::getItemId).toList();

        Map<UUID, Artwork> artworks = artworkRepository.findAllById(artworkIds).stream()
                .collect(Collectors.toMap(Artwork::getId, a -> a));
        Map<UUID, Supply> supplies = supplyRepository.findAllById(supplyIds).stream()
                .collect(Collectors.toMap(Supply::getId, s -> s));

        return items.stream().map(i -> {
            if (CartItem.SUPPLY.equals(i.getItemType())) {
                Supply s = supplies.get(i.getItemId());
                if (s == null) return null;
                return new CartItemDto(i.getId(), i.getQuantity(), CartItem.SUPPLY, s.getId(), null,
                        s.getName(), s.getSlug(), s.getPriceZmw(), s.getCoverImageUrl());
            }
            Artwork a = artworks.get(i.getItemId());
            if (a == null) return null;
            return new CartItemDto(i.getId(), i.getQuantity(), CartItem.ARTWORK, a.getId(), a.getId(),
                    a.getTitle(), a.getSlug(), a.getPriceZmw(), a.getCoverImageUrl());
        }).filter(java.util.Objects::nonNull).toList();
    }

    @Transactional
    public void add(AddToCartRequest req) {
        UUID userId = SecurityUtils.currentUserId();
        String itemType = normalizeItemType(req.itemType());
        UUID itemId = req.itemId();

        if (CartItem.SUPPLY.equals(itemType)) {
            if (!supplyRepository.existsById(itemId)) {
                throw ApiException.notFound("Supply not found");
            }
        } else if (!artworkRepository.existsById(itemId)) {
            throw ApiException.notFound("Artwork not found");
        }

        CartItem item = cartItemRepository.findByUserIdAndItemTypeAndItemId(userId, itemType, itemId)
                .orElseGet(() -> {
                    CartItem c = new CartItem();
                    c.setUserId(userId);
                    c.setItemType(itemType);
                    c.setItemId(itemId);
                    if (CartItem.ARTWORK.equals(itemType)) {
                        c.setArtworkId(itemId);
                    }
                    return c;
                });
        item.setQuantity(req.quantity());
        cartItemRepository.save(item);
    }

    @Transactional
    public void remove(UUID id) {
        UUID userId = SecurityUtils.currentUserId();
        CartItem item = cartItemRepository.findById(id).orElseThrow(() -> ApiException.notFound("Cart item not found"));
        if (!item.getUserId().equals(userId)) {
            throw ApiException.forbidden("Not your cart item");
        }
        cartItemRepository.delete(item);
    }

    private String normalizeItemType(String itemType) {
        if (itemType == null || itemType.isBlank()) {
            return CartItem.ARTWORK;
        }
        String upper = itemType.trim().toUpperCase();
        if (!CartItem.ARTWORK.equals(upper) && !CartItem.SUPPLY.equals(upper)) {
            throw ApiException.badRequest("Unknown item type: " + itemType);
        }
        return upper;
    }
}
