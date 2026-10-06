package com.artcanvaszambia.backend.inbox;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.security.AppUserPrincipal;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/** Public contact / art-advisory messages and newsletter sign-ups, kept for the admin team. */
@Service
@RequiredArgsConstructor
public class InboxService {
    private static final Set<String> TOPICS = Set.of("general", "advisory", "order", "selling", "press");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final NotificationService notificationService;

    public record ContactRequest(String name, String email, String topic, String message, BigDecimal budgetZmw) {
    }

    public record ContactMessageDto(UUID id, String name, String email, String topic, String message, BigDecimal budgetZmw,
                                    String status, Instant createdAt) {
    }

    public record SubscriberDto(String email, Instant createdAt) {
    }

    @Transactional
    public void contact(ContactRequest req) {
        String name = req.name() == null ? "" : req.name().trim();
        String email = req.email() == null ? "" : req.email().trim().toLowerCase();
        String topic = req.topic() == null ? "general" : req.topic().trim().toLowerCase();
        String message = req.message() == null ? "" : req.message().trim();
        if (name.isEmpty() || name.length() > 120) throw ApiException.badRequest("Please tell us your name");
        if (!EMAIL.matcher(email).matches()) throw ApiException.badRequest("Please enter a valid email address");
        if (!TOPICS.contains(topic)) throw ApiException.badRequest("Choose what your message is about");
        if (message.isEmpty() || message.length() > 4000) throw ApiException.badRequest("Please write a message (up to 4000 characters)");
        Long recent = jdbc.queryForObject("select count(*) from contact_messages where lower(email) = ? and created_at > ?",
                Long.class, email, Timestamp.from(Instant.now().minusSeconds(3600)));
        if (recent != null && recent >= 5) {
            throw ApiException.badRequest("You've sent several messages recently — we'll reply soon");
        }
        AppUserPrincipal user = SecurityUtils.currentPrincipalOrNull();
        jdbc.update("insert into contact_messages (user_id, name, email, topic, message, budget_zmw) values (?, ?, ?, ?, ?, ?)",
                user != null ? user.getId() : null, name, email, topic, message, req.budgetZmw());
        String label = "advisory".equals(topic) ? "Art advisory request" : "New " + topic + " message";
        notificationService.adminAlert(label + " from " + name, List.of(
                name + " (" + email + ") wrote:" + (req.budgetZmw() != null ? " · budget K" + req.budgetZmw().toPlainString() : ""),
                "“" + (message.length() > 500 ? message.substring(0, 500) + "…" : message) + "”"), "/admin");
    }

    public List<ContactMessageDto> adminMessages() {
        return jdbc.query("select * from contact_messages order by created_at desc limit 300", (rs, i) -> new ContactMessageDto(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("email"), rs.getString("topic"),
                rs.getString("message"), rs.getBigDecimal("budget_zmw"), rs.getString("status"),
                rs.getTimestamp("created_at").toInstant()));
    }

    @Transactional
    public void setStatus(UUID id, String status) {
        if (!Set.of("new", "handled").contains(status)) throw ApiException.badRequest("Status must be new or handled");
        if (jdbc.update("update contact_messages set status = ? where id = ?", status, id) == 0) {
            throw ApiException.notFound("Message not found");
        }
    }

    @Transactional
    public void subscribe(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase();
        if (!EMAIL.matcher(email).matches()) throw ApiException.badRequest("Please enter a valid email address");
        byte[] bytes = new byte[18];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        // Re-subscribing clears a previous unsubscribe; existing tokens are kept so old links still work.
        jdbc.update("insert into newsletter_subscribers (email, unsubscribe_token) values (?, ?) "
                + "on conflict ((lower(email))) do update set unsubscribed_at = null", email, token);
    }

    @Transactional
    public void unsubscribe(String token) {
        if (token == null || jdbc.update("update newsletter_subscribers set unsubscribed_at = now() where unsubscribe_token = ? "
                + "and unsubscribed_at is null", token) == 0) {
            // Unknown or already-used token: answer the same way to avoid leaking anything.
            return;
        }
    }

    public List<SubscriberDto> subscribers() {
        return jdbc.query("select email, created_at from newsletter_subscribers where unsubscribed_at is null order by created_at desc",
                (rs, i) -> new SubscriberDto(rs.getString("email"), rs.getTimestamp("created_at").toInstant()));
    }
}
