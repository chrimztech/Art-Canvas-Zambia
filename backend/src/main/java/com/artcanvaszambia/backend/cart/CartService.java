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
    private final com.artcanvaszambia.backend.profile.ProfileRepository profileRepository;

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
        java.util.Set<UUID> away = profileRepository.findByIdIn(java.util.stream.Stream.concat(
                        artworks.values().stream().map(Artwork::getArtistId), supplies.values().stream().map(Supply::getSellerId))
                        .distinct().toList()).stream()
                .filter(com.artcanvaszambia.backend.profile.Profile::isVacationMode)
                .map(com.artcanvaszambia.backend.profile.Profile::getId).collect(Collectors.toSet());

        return items.stream().map(i -> {
            if (CartItem.SUPPLY.equals(i.getItemType())) {
                Supply s = supplies.get(i.getItemId());
                if (s == null) return null;
                boolean available = Supply.PUBLISHED.equals(s.getStatus()) && s.getStock() >= i.getQuantity()
                        && !away.contains(s.getSellerId());
                return new CartItemDto(i.getId(), i.getQuantity(), CartItem.SUPPLY, s.getId(), null,
                        s.getName(), s.getSlug(), s.getPriceZmw(), s.getCoverImageUrl(), available, Math.max(s.getStock(), 1));
            }
            Artwork a = artworks.get(i.getItemId());
            if (a == null) return null;
            return new CartItemDto(i.getId(), i.getQuantity(), CartItem.ARTWORK, a.getId(), a.getId(),
                    a.getTitle(), a.getSlug(), a.getPriceZmw(), a.getCoverImageUrl(),
                    Artwork.PUBLISHED.equals(a.getStatus()) && !away.contains(a.getArtistId()), maxArtworkQuantity(a));
        }).filter(java.util.Objects::nonNull).toList();
    }

    @Transactional
    public void add(AddToCartRequest req) {
        UUID userId = SecurityUtils.currentUserId();
        String itemType = normalizeItemType(req.itemType());
        UUID itemId = req.itemId();
        int quantity = req.quantity() > 0 ? req.quantity() : 1;

        if (CartItem.SUPPLY.equals(itemType)) {
            Supply s = supplyRepository.findById(itemId).orElseThrow(() -> ApiException.notFound("Supply not found"));
            requireSupplyAvailable(s, userId, quantity);
        } else {
            Artwork a = artworkRepository.findById(itemId).orElseThrow(() -> ApiException.notFound("Artwork not found"));
            requireArtworkAvailable(a, userId, quantity);
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
        item.setQuantity(quantity);
        cartItemRepository.save(item);
    }

    @Transactional
    public void updateQuantity(UUID id, int quantity) {
        UUID userId = SecurityUtils.currentUserId();
        CartItem item = cartItemRepository.findById(id).orElseThrow(() -> ApiException.notFound("Cart item not found"));
        if (!item.getUserId().equals(userId)) {
            throw ApiException.forbidden("Not your cart item");
        }
        if (CartItem.SUPPLY.equals(item.getItemType())) {
            Supply s = supplyRepository.findById(item.getItemId()).orElseThrow(() -> ApiException.notFound("Supply not found"));
            requireSupplyAvailable(s, userId, quantity);
        } else {
            Artwork a = artworkRepository.findById(item.getItemId()).orElseThrow(() -> ApiException.notFound("Artwork not found"));
            requireArtworkAvailable(a, userId, quantity);
        }
        item.setQuantity(quantity);
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

    /** Shared with checkout so the cart and the payment step enforce identical rules. */
    public static void requireArtworkAvailable(Artwork a, UUID buyerId, int quantity) {
        if (a.getArtistId().equals(buyerId)) {
            throw ApiException.badRequest("You can't buy your own artwork");
        }
        if (!Artwork.PUBLISHED.equals(a.getStatus())) {
            throw ApiException.badRequest("\"" + a.getTitle() + "\" is no longer available");
        }
        if (quantity > maxArtworkQuantity(a)) {
            throw ApiException.badRequest(a.isOriginal()
                    ? "\"" + a.getTitle() + "\" is a one-of-a-kind original"
                    : "Only " + maxArtworkQuantity(a) + " prints of \"" + a.getTitle() + "\" are available");
        }
    }

    public static void requireSupplyAvailable(Supply s, UUID buyerId, int quantity) {
        if (s.getSellerId().equals(buyerId)) {
            throw ApiException.badRequest("You can't buy your own listing");
        }
        if (!Supply.PUBLISHED.equals(s.getStatus())) {
            throw ApiException.badRequest("\"" + s.getName() + "\" is no longer available");
        }
        if (quantity > s.getStock()) {
            throw ApiException.badRequest(s.getStock() <= 0
                    ? "\"" + s.getName() + "\" is out of stock"
                    : "Only " + s.getStock() + " of \"" + s.getName() + "\" left in stock");
        }
    }

    private static int maxArtworkQuantity(Artwork a) {
        if (a.isOriginal()) return 1;
        return a.getEditionSize() != null && a.getEditionSize() > 0 ? a.getEditionSize() : 10;
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
