package com.artcanvaszambia.backend.notifications;

import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.auth.UserRoleRepository;
import com.artcanvaszambia.backend.commissions.Commission;
import com.artcanvaszambia.backend.messaging.Conversation;
import com.artcanvaszambia.backend.messaging.Message;
import com.artcanvaszambia.backend.orders.Order;
import com.artcanvaszambia.backend.orders.OrderItem;
import com.artcanvaszambia.backend.orders.OrderItemRepository;
import com.artcanvaszambia.backend.payouts.PayoutRequest;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.refunds.RefundRequest;
import com.artcanvaszambia.backend.reviews.Review;
import com.artcanvaszambia.backend.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Every transactional email the platform sends. Content is assembled from the current transaction's
 * data, but delivery waits until it commits, so nobody is emailed about a change that rolled back.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final ProfileRepository profileRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserNotificationRepository userNotificationRepository;

    // ---------- account

    public void welcome(User user, String displayName) {
        email(user.getEmail(), "Welcome to ChrisEpic Arts", List.of(
                "Hi " + firstName(displayName) + ",",
                "Your account is ready. Browse original work from Zambian artists, commission something custom, or enable "
                        + "selling tools from your dashboard to open your own studio."), "Go to your dashboard", "/dashboard");
    }

    public void passwordReset(User user, String token) {
        email(user.getEmail(), "Reset your password", List.of(
                "Someone (hopefully you) asked to reset the password for this account.",
                "The link below works once and expires in one hour. If you didn't ask for this, you can ignore this email — "
                        + "your password won't change."), "Choose a new password",
                "/reset-password?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8));
    }

    public void passwordChanged(User user) {
        email(user.getEmail(), "Your password was changed", List.of(
                "The password for your ChrisEpic Arts account was just changed and you've been signed out on all devices.",
                "If this wasn't you, reset your password immediately and contact us."), "Sign in", "/auth");
    }

    // ---------- orders

    /** Buyer receipt plus one "you made a sale" email per seller. */
    public void orderPaid(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        List<String> lines = new ArrayList<>();
        lines.add("Thank you! Payment for order " + order.getOrderNumber() + " is confirmed.");
        lines.add(items.stream().map(i -> "• " + i.getTitle() + " × " + i.getQuantity() + " — " + money(i.getLineTotalZmw()))
                .collect(Collectors.joining("\n")) + "\nTotal: " + money(order.getTotalZmw()));
        if (items.stream().anyMatch(OrderItem::isPhysical)) {
            lines.add("Sellers have been notified and will ship or arrange collection. You can track each item from your order page.");
        }
        notify(order.getBuyerId(), "Order " + order.getOrderNumber() + " confirmed", lines, "View your order",
                "/orders/" + order.getId());

        Map<UUID, List<OrderItem>> bySeller = items.stream().filter(i -> i.getSellerId() != null)
                .collect(Collectors.groupingBy(OrderItem::getSellerId, LinkedHashMap::new, Collectors.toList()));
        bySeller.forEach((sellerId, sold) -> {
            boolean ship = sold.stream().anyMatch(OrderItem::isPhysical);
            notify(sellerId, "New sale: " + sold.get(0).getTitle() + (sold.size() > 1 ? " and more" : ""), List.of(
                    "Good news — you've made a sale on order " + order.getOrderNumber() + ".",
                    sold.stream().map(i -> "• " + i.getTitle() + " × " + i.getQuantity() + " — you earn " + money(i.getArtistPayoutZmw()))
                            .collect(Collectors.joining("\n")),
                    ship ? "The buyer's delivery details are on your sales page. Please ship promptly and mark it as shipped."
                            : "Nothing to ship — the buyer's access has been confirmed automatically."),
                    ship ? "Ship this order" : "View your sales", "/sales");
        });
    }

    public void itemShipped(Order order, OrderItem item) {
        String tracking = item.getCarrier() != null || item.getTrackingNumber() != null
                ? "Courier: " + Objects.toString(item.getCarrier(), "—") + (item.getTrackingNumber() != null ? " · Tracking: " + item.getTrackingNumber() : "")
                : "The seller will be in touch about delivery.";
        notify(order.getBuyerId(), "Shipped: " + item.getTitle(), List.of(
                "“" + item.getTitle() + "” from order " + order.getOrderNumber() + " is on its way.", tracking,
                "When it arrives, please confirm receipt on your order page."), "Track your order", "/orders/" + order.getId());
    }

    // ---------- commissions

    public void commissionRequested(Commission c) {
        if (c.getArtistId() == null) return;
        notify(c.getArtistId(), "New commission request: " + c.getTitle(), List.of(
                nameOf(c.getCustomerId()) + " would like to commission you.",
                "“" + truncate(c.getBrief(), 400) + "”" + (c.getBudgetZmw() != null ? "\nBudget: " + money(c.getBudgetZmw()) : ""),
                "Send a quote to get started, or pass if it's not a fit."), "Review the brief", "/dashboard/commissions");
    }

    public void commissionQuoted(Commission c) {
        notify(c.getCustomerId(), "You have a quote for “" + c.getTitle() + "”", List.of(
                nameOf(c.getArtistId()) + " quoted " + money(c.getQuotedPriceZmw()) + " for your commission."
                        + (c.getArtistNote() != null ? "\n\n“" + truncate(c.getArtistNote(), 400) + "”" : ""),
                "Accept by paying the quote — the artist starts once payment clears."), "Review the quote", "/dashboard/my-commissions");
    }

    public void commissionPaid(Commission c) {
        notify(c.getArtistId(), "Commission paid: " + c.getTitle(), List.of(
                nameOf(c.getCustomerId()) + " accepted your quote of " + money(c.getQuotedPriceZmw()) + " and paid.",
                "Mark it as started when you begin work so they can follow along."), "Open commission", "/dashboard/commissions");
    }

    public void commissionStatus(Commission c) {
        if (Commission.DELIVERED.equals(c.getStatus())) {
            notify(c.getCustomerId(), "Your commission has been delivered", List.of(
                    nameOf(c.getArtistId()) + " marked “" + c.getTitle() + "” as delivered.",
                    "Once you have it, please confirm completion — and consider leaving a review."), "Confirm completion", "/dashboard/my-commissions");
        } else if (Commission.IN_PROGRESS.equals(c.getStatus())) {
            notify(c.getCustomerId(), "Work has started on “" + c.getTitle() + "”", List.of(
                    nameOf(c.getArtistId()) + " has started your commission."), "Follow progress", "/dashboard/my-commissions");
        } else if (Commission.COMPLETED.equals(c.getStatus()) && c.getArtistId() != null) {
            notify(c.getArtistId(), "Commission completed: " + c.getTitle(), List.of(
                    nameOf(c.getCustomerId()) + " confirmed they've received their commission. Nice work!"), "View your sales", "/sales");
        }
    }

    // ---------- payouts

    public void payoutUpdated(PayoutRequest p) {
        if (p.getArtistId() == null) return; // platform (developer/owner) withdrawals
        if (PayoutRequest.PAID.equals(p.getStatus())) {
            notify(p.getArtistId(), "Payout sent: " + money(p.getAmountZmw()), List.of(
                    "Your payout " + p.getReferenceNo() + " of " + money(p.getAmountZmw()) + " has been sent to "
                            + ("momo".equals(p.getMethod()) ? "mobile money " + p.getPhone() : p.getBankName() + " account " + p.getReceiverId()) + "."),
                    "View payouts", "/sales");
        } else if (PayoutRequest.FAILED.equals(p.getStatus()) || PayoutRequest.REJECTED.equals(p.getStatus())) {
            notify(p.getArtistId(), "Payout " + p.getStatus() + ": " + money(p.getAmountZmw()), List.of(
                    "Your payout " + p.getReferenceNo() + " was " + p.getStatus() + "."
                            + (p.getAdminNote() != null ? "\nReason: " + p.getAdminNote() : ""),
                    "The amount is back in your available balance — check your payout details and request again."), "View payouts", "/sales");
        }
    }

    // ---------- messaging

    public void newMessage(Conversation c, Message m, UUID recipientId) {
        notify(recipientId, "New message from " + nameOf(m.getSenderId()), List.of(
                c.getSubject() != null ? c.getSubject() : "You have a new message.",
                "“" + truncate(m.getBody(), 500) + "”"), "Reply", "/messages?c=" + c.getId());
    }

    // ---------- reviews

    public void reviewReceived(Review r) {
        notify(r.getSellerId(), "New " + r.getRating() + "-star review", List.of(
                "A buyer reviewed “" + r.getItemTitle() + "”: " + "★".repeat(r.getRating()) + "☆".repeat(5 - r.getRating())
                        + (r.getComment() != null ? "\n\n“" + truncate(r.getComment(), 500) + "”" : ""),
                "You can reply publicly from your profile."), "See your reviews", "/artists/" + r.getSellerId());
    }

    // ---------- refunds

    public void refundRequested(RefundRequest r, OrderItem item, Order order) {
        List<String> body = List.of(
                nameOf(r.getBuyerId()) + " requested a refund of " + money(r.getAmountZmw()) + " for “" + item.getTitle()
                        + "” (order " + order.getOrderNumber() + ").",
                "Reason: " + truncate(r.getReason(), 500));
        if (r.getSellerId() != null) {
            notify(r.getSellerId(), "Refund requested: " + item.getTitle(),
                    Stream.concat(body.stream(), Stream.of("You can add your side of the story before an admin decides.")).toList(),
                    "Respond", "/sales");
        }
        Stream.of(Role.ADMIN, Role.SUPER_ADMIN).flatMap(role -> userRoleRepository.findByRole(role).stream())
                .map(ur -> ur.getUserId()).distinct()
                .forEach(adminId -> notify(adminId, "Refund to review: " + order.getOrderNumber(), body, "Review refunds", "/admin"));
    }

    public void refundResolved(RefundRequest r, OrderItem item, Order order) {
        boolean refunded = RefundRequest.REFUNDED.equals(r.getStatus());
        String note = r.getAdminNote() != null ? "\nNote: " + r.getAdminNote() : "";
        notify(r.getBuyerId(), refunded ? "Refund approved: " + money(r.getAmountZmw()) : "Refund request declined", List.of(
                refunded
                        ? "Your refund of " + money(r.getAmountZmw()) + " for “" + item.getTitle() + "” has been approved and sent back to your original payment method." + note
                        : "Your refund request for “" + item.getTitle() + "” was declined." + note), "View your order", "/orders/" + order.getId());
        if (r.getSellerId() != null) {
            notify(r.getSellerId(), (refunded ? "Refund issued: " : "Refund declined: ") + item.getTitle(), List.of(
                    refunded
                            ? "The buyer was refunded " + money(r.getAmountZmw()) + " for “" + item.getTitle() + "”. This sale no longer counts towards your earnings." + note
                            : "The refund request for “" + item.getTitle() + "” was declined, so the sale stands." + note), "View your sales", "/sales");
        }
    }

    // ---------- offers

    public void offerReceived(UUID artistId, UUID buyerId, String artworkTitle, BigDecimal amount, String message) {
        notify(artistId, "New offer: " + money(amount) + " for “" + artworkTitle + "”", List.of(
                nameOf(buyerId) + " offered " + money(amount) + " for “" + artworkTitle + "”."
                        + (message != null && !message.isBlank() ? "\n\n“" + truncate(message, 400) + "”" : ""),
                "Accept, decline or send a counter-offer. Offers expire after 3 days."), "Respond to the offer", "/dashboard/offers");
    }

    public void offerUpdated(UUID buyerId, UUID artistId, String artworkTitle, String status, BigDecimal amount) {
        String subject = switch (status) {
            case "accepted" -> "Offer accepted: “" + artworkTitle + "”";
            case "countered" -> "Counter-offer for “" + artworkTitle + "”: " + money(amount);
            default -> "Offer declined: “" + artworkTitle + "”";
        };
        String line = switch (status) {
            case "accepted" -> nameOf(artistId) + " accepted your offer of " + money(amount)
                    + ". Complete your purchase within 3 days — after that the piece goes back on sale.";
            case "countered" -> nameOf(artistId) + " countered with " + money(amount) + ". You can accept it or make a new offer.";
            default -> nameOf(artistId) + " declined your offer. The piece is still available at its listed price.";
        };
        notify(buyerId, subject, List.of(line), "View your offers", "/dashboard/offers");
    }

    public void counterAccepted(UUID artistId, UUID buyerId, String artworkTitle, BigDecimal amount) {
        notify(artistId, "Counter-offer accepted: “" + artworkTitle + "”", List.of(
                nameOf(buyerId) + " accepted your counter-offer of " + money(amount) + " and can now complete the purchase."),
                "View offers", "/dashboard/offers");
    }

    // ---------- follows, alerts, waitlists, gift cards

    public void newWorkFromFollowedArtist(UUID followerId, UUID artistId, String title, String slug) {
        notify(followerId, nameOf(artistId) + " published new work", List.of(
                "“" + title + "” by " + nameOf(artistId) + ", an artist you follow, is now available."), "See the artwork", "/artworks/" + slug);
    }

    public void savedSearchMatch(UUID userId, String searchName, String title, String slug) {
        notify(userId, "New match for “" + searchName + "”", List.of(
                "“" + title + "” matches your saved search “" + searchName + "”."), "See the artwork", "/artworks/" + slug);
    }

    public void waitlistSeatAvailable(UUID userId, String title, String path) {
        notify(userId, "A place opened up: " + title, List.of(
                "Good news — a place is now available for “" + title + "”. Places go to whoever books first."), "Book now", path);
    }

    public void giftCardIssued(String recipientEmail, String recipientName, UUID purchaserId, String code, BigDecimal amount, String message) {
        String from = nameOf(purchaserId);
        List<String> body = new ArrayList<>();
        body.add("Hi " + firstName(recipientName) + ", " + from + " sent you a ChrisEpic Arts gift card worth " + money(amount) + ".");
        if (message != null && !message.isBlank()) body.add("“" + truncate(message, 500) + "”");
        body.add("Your code: " + code + "\nEnter it at checkout to spend it on original art, supplies, classes or tickets.");
        email(recipientEmail, from + " sent you a " + money(amount) + " gift card", body, "Start browsing", "/browse");
    }

    public void giftCardPurchased(UUID purchaserId, String code, BigDecimal amount, String recipientEmail) {
        notify(purchaserId, "Your " + money(amount) + " gift card is ready", List.of(
                recipientEmail != null ? "We've emailed the gift card to " + recipientEmail + "." : "Your gift card is ready to share.",
                "Code: " + code), "View gift cards", "/dashboard/gift-cards");
    }

    // ---------- moderation & inbox

    public void adminAlert(String subject, List<String> paragraphs, String path) {
        Stream.of(Role.ADMIN, Role.SUPER_ADMIN).flatMap(role -> userRoleRepository.findByRole(role).stream())
                .map(ur -> ur.getUserId()).distinct()
                .forEach(adminId -> notify(adminId, subject, paragraphs, "Open admin panel", path));
    }

    // ---------- helpers

    /** In-app notification (saved with the current transaction) plus the matching email. */
    private void notify(UUID userId, String subject, List<String> paragraphs, String cta, String path) {
        if (userId == null) return;
        UserNotification n = new UserNotification();
        n.setUserId(userId);
        n.setTitle(truncate(subject, 200));
        n.setBody(paragraphs.isEmpty() ? null : truncate(paragraphs.get(0), 300));
        n.setLink(path);
        userNotificationRepository.save(n);
        email(emailOf(userId), subject, paragraphs, cta, path);
    }

    /** Sends once the surrounding transaction commits (or immediately when there is none). */
    private void email(String to, String subject, List<String> paragraphs, String cta, String path) {
        if (to == null) return;
        Runnable send = () -> emailService.send(to, subject, paragraphs, cta, path);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }

    private String emailOf(UUID userId) {
        return userId == null ? null : userRepository.findById(userId).map(User::getEmail).orElse(null);
    }

    private String nameOf(UUID userId) {
        if (userId == null) return "Someone";
        return profileRepository.findById(userId).map(Profile::getDisplayName).filter(n -> n != null && !n.isBlank()).orElse("A member");
    }

    private static String firstName(String displayName) {
        return displayName == null || displayName.isBlank() ? "there" : displayName.trim().split("\\s+")[0];
    }

    private static String money(BigDecimal amount) {
        return amount == null ? "K0" : "K" + amount.stripTrailingZeros().toPlainString();
    }

    private static String truncate(String s, int max) {
        return s == null ? "" : s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
