package com.artcanvaszambia.backend.messaging;

import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.classes.ClassRepository;
import com.artcanvaszambia.backend.commissions.CommissionRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.exhibitions.ExhibitionRepository;
import com.artcanvaszambia.backend.messaging.dto.MessagingDtos.ConversationDetailDto;
import com.artcanvaszambia.backend.messaging.dto.MessagingDtos.ConversationSummaryDto;
import com.artcanvaszambia.backend.messaging.dto.MessagingDtos.MessageDto;
import com.artcanvaszambia.backend.messaging.dto.MessagingDtos.StartConversationRequest;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.orders.OrderItem;
import com.artcanvaszambia.backend.orders.OrderItemRepository;
import com.artcanvaszambia.backend.orders.OrderRepository;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.supplies.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Private one-to-one messaging between buyers and sellers, optionally scoped to a listing, order or commission. */
@Service
@RequiredArgsConstructor
public class MessagingService {
    private static final Set<String> CONTEXT_TYPES = Set.of("GENERAL", "ARTWORK", "SUPPLY", "CLASS", "EXHIBITION", "ORDER", "COMMISSION");

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final ArtworkRepository artworkRepository;
    private final SupplyRepository supplyRepository;
    private final ClassRepository classRepository;
    private final ExhibitionRepository exhibitionRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CommissionRepository commissionRepository;
    private final NotificationService notificationService;
    private final com.artcanvaszambia.backend.moderation.ModerationService moderationService;

    @Transactional
    public ConversationDetailDto start(StartConversationRequest req) {
        UUID me = SecurityUtils.currentUserId();
        UUID other = req.recipientId();
        if (other.equals(me)) {
            throw ApiException.badRequest("You can't message yourself");
        }
        if (!userRepository.existsById(other)) {
            throw ApiException.notFound("That user doesn't exist");
        }
        String type = req.contextType() == null || req.contextType().isBlank() ? "GENERAL" : req.contextType().trim().toUpperCase();
        if (!CONTEXT_TYPES.contains(type)) {
            throw ApiException.badRequest("Unknown conversation context");
        }
        UUID contextId = "GENERAL".equals(type) ? null : req.contextId();
        if (!"GENERAL".equals(type) && contextId == null) {
            throw ApiException.badRequest("Missing context id");
        }
        String subject = resolveSubject(type, contextId, me, other);

        // Order the pair like Postgres does (unsigned bytes). UUID.compareTo compares signed longs and
        // disagrees for ids starting 8-f, which would violate the participant_a < participant_b check.
        UUID a = me.toString().compareTo(other.toString()) < 0 ? me : other;
        UUID b = a.equals(me) ? other : me;
        Conversation conversation = (contextId == null
                ? conversationRepository.findByParticipantAAndParticipantBAndContextTypeAndContextIdIsNull(a, b, type)
                : conversationRepository.findByParticipantAAndParticipantBAndContextTypeAndContextId(a, b, type, contextId))
                .orElseGet(() -> {
                    Conversation c = new Conversation();
                    c.setParticipantA(a);
                    c.setParticipantB(b);
                    c.setContextType(type);
                    c.setContextId(contextId);
                    c.setSubject(subject);
                    return conversationRepository.save(c);
                });
        post(conversation, me, req.body());
        return detail(conversation, me);
    }

    public List<ConversationSummaryDto> mine() {
        UUID me = SecurityUtils.currentUserId();
        List<Conversation> conversations = conversationRepository.findForUser(me, PageRequest.of(0, 100));
        Map<UUID, Profile> profiles = profilesFor(conversations, me);
        return conversations.stream().map(c -> summary(c, me, profiles.get(c.otherParticipant(me)))).toList();
    }

    @Transactional
    public ConversationDetailDto read(UUID conversationId) {
        UUID me = SecurityUtils.currentUserId();
        Conversation c = requireParticipant(conversationId, me);
        messageRepository.markRead(c.getId(), me, Instant.now());
        return detail(c, me);
    }

    @Transactional
    public ConversationDetailDto send(UUID conversationId, String body) {
        UUID me = SecurityUtils.currentUserId();
        Conversation c = requireParticipant(conversationId, me);
        post(c, me, body);
        return detail(c, me);
    }

    public long unreadCount() {
        return messageRepository.countUnreadFor(SecurityUtils.currentUserId());
    }

    private void post(Conversation c, UUID sender, String body) {
        if (moderationService.blockedEitherWay(sender, c.otherParticipant(sender))) {
            throw ApiException.forbidden("You can't message this member");
        }
        String text = body.trim();
        if (text.isEmpty()) {
            throw ApiException.badRequest("Message can't be empty");
        }
        // Replying means you've seen what the other person wrote.
        messageRepository.markRead(c.getId(), sender, Instant.now());
        Message m = new Message();
        m.setConversationId(c.getId());
        m.setSenderId(sender);
        m.setBody(text);
        messageRepository.save(m);
        c.setLastMessageAt(m.getCreatedAt());
        conversationRepository.save(c);
        // Email only for the first unread message in a burst, so a chatty thread doesn't flood inboxes.
        if (messageRepository.countByConversationIdAndSenderIdAndReadAtIsNull(c.getId(), sender) == 1) {
            notificationService.newMessage(c, m, c.otherParticipant(sender));
        }
    }

    private Conversation requireParticipant(UUID conversationId, UUID me) {
        Conversation c = conversationRepository.findById(conversationId)
                .orElseThrow(() -> ApiException.notFound("Conversation not found"));
        if (!c.involves(me)) {
            throw ApiException.notFound("Conversation not found");
        }
        return c;
    }

    /** Validates that the two people are actually the parties to the context, and names it. */
    private String resolveSubject(String type, UUID id, UUID me, UUID other) {
        Set<UUID> pair = Set.of(me, other);
        return switch (type) {
            case "ARTWORK" -> artworkRepository.findById(id).filter(a -> pair.contains(a.getArtistId()))
                    .map(a -> "About “" + a.getTitle() + "”").orElseThrow(this::badContext);
            case "SUPPLY" -> supplyRepository.findById(id).filter(s -> pair.contains(s.getSellerId()))
                    .map(s -> "About “" + s.getName() + "”").orElseThrow(this::badContext);
            case "CLASS" -> classRepository.findById(id).filter(c -> pair.contains(c.getInstructorId()))
                    .map(c -> "Class: " + c.getTitle()).orElseThrow(this::badContext);
            case "EXHIBITION" -> exhibitionRepository.findById(id).filter(e -> pair.contains(e.getOrganizerId()))
                    .map(e -> "Exhibition: " + e.getTitle()).orElseThrow(this::badContext);
            case "COMMISSION" -> commissionRepository.findById(id)
                    .filter(c -> c.getArtistId() != null && pair.equals(Set.of(c.getCustomerId(), c.getArtistId())))
                    .map(c -> "Commission: " + c.getTitle()).orElseThrow(this::badContext);
            case "ORDER" -> orderRepository.findById(id).filter(o -> {
                        Set<UUID> sellers = orderItemRepository.findByOrderId(o.getId()).stream()
                                .map(OrderItem::getSellerId).collect(Collectors.toSet());
                        return (o.getBuyerId().equals(me) && sellers.contains(other))
                                || (o.getBuyerId().equals(other) && sellers.contains(me));
                    })
                    .map(o -> "Order " + o.getOrderNumber()).orElseThrow(this::badContext);
            default -> null;
        };
    }

    private ApiException badContext() {
        return ApiException.badRequest("You can only message the other party about this");
    }

    private String contextPath(Conversation c, UUID viewer) {
        if (c.getContextId() == null) return null;
        UUID id = c.getContextId();
        return switch (c.getContextType()) {
            case "ARTWORK" -> artworkRepository.findById(id).map(a -> "/artworks/" + a.getSlug()).orElse(null);
            case "SUPPLY" -> supplyRepository.findById(id).map(s -> "/supplies/" + s.getSlug()).orElse(null);
            case "CLASS" -> classRepository.findById(id).map(x -> "/classes/" + x.getSlug()).orElse(null);
            case "EXHIBITION" -> exhibitionRepository.findById(id).map(e -> "/exhibitions/" + e.getSlug()).orElse(null);
            case "ORDER" -> orderRepository.findById(id).map(o -> o.getBuyerId().equals(viewer) ? "/orders/" + o.getId() : "/sales").orElse(null);
            case "COMMISSION" -> commissionRepository.findById(id)
                    .map(x -> x.getCustomerId().equals(viewer) ? "/dashboard/my-commissions" : "/dashboard/commissions").orElse(null);
            default -> null;
        };
    }

    private ConversationDetailDto detail(Conversation c, UUID me) {
        Profile other = profileRepository.findById(c.otherParticipant(me)).orElse(null);
        List<MessageDto> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(c.getId()).stream()
                .map(m -> new MessageDto(m.getId(), m.getSenderId(), m.getSenderId().equals(me), m.getBody(), m.getCreatedAt(), m.getReadAt()))
                .toList();
        return new ConversationDetailDto(summary(c, me, other), messages);
    }

    private ConversationSummaryDto summary(Conversation c, UUID me, Profile other) {
        Message last = messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(c.getId()).orElse(null);
        String preview = last == null ? null : last.getBody().length() > 140 ? last.getBody().substring(0, 140) + "…" : last.getBody();
        return new ConversationSummaryDto(c.getId(), c.otherParticipant(me), other != null ? other.getDisplayName() : null,
                other != null ? other.getAvatarUrl() : null, c.getSubject(), c.getContextType(), c.getContextId(),
                contextPath(c, me), preview, last != null && last.getSenderId().equals(me), c.getLastMessageAt(),
                messageRepository.countByConversationIdAndSenderIdNotAndReadAtIsNull(c.getId(), me));
    }

    private Map<UUID, Profile> profilesFor(List<Conversation> conversations, UUID me) {
        return profileRepository.findByIdIn(conversations.stream().map(c -> c.otherParticipant(me)).distinct().toList())
                .stream().collect(Collectors.toMap(Profile::getId, Function.identity()));
    }
}
