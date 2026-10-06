package com.artcanvaszambia.backend.moderation;

import com.artcanvaszambia.backend.audit.AuditService;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.classes.ClassRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.exhibitions.ExhibitionRepository;
import com.artcanvaszambia.backend.notifications.NotificationService;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.supplies.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
interface ReportRepository extends JpaRepository<Report, UUID> {
    List<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatus(UUID reporterId, String targetType, UUID targetId, String status);
}

/** Reports (admin moderation queue) and member-to-member blocks. */
@Service
@RequiredArgsConstructor
public class ModerationService {
    private static final Set<String> TARGETS = Set.of("ARTWORK", "SUPPLY", "CLASS", "EXHIBITION", "USER", "REVIEW", "MESSAGE");
    private static final Set<String> REASONS = Set.of("counterfeit", "inappropriate", "spam", "scam", "copyright", "harassment", "other");

    private final ReportRepository reportRepository;
    private final ProfileRepository profileRepository;
    private final ArtworkRepository artworkRepository;
    private final SupplyRepository supplyRepository;
    private final ClassRepository classRepository;
    private final ExhibitionRepository exhibitionRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final JdbcTemplate jdbc;

    public record ReportRequest(String targetType, UUID targetId, String reason, String details) {
    }

    public record ResolveRequest(String status, String note) {
    }

    public record ReportDto(UUID id, String targetType, UUID targetId, String targetLabel, String targetPath, String reason,
                            String details, String status, String adminNote, UUID reporterId, String reporterName,
                            Instant createdAt, Instant resolvedAt) {
    }

    public record BlockedUserDto(UUID id, String displayName, String avatarUrl) {
    }

    // ---------- reports

    @Transactional
    public void report(ReportRequest req) {
        UUID me = SecurityUtils.currentUserId();
        String type = req.targetType() == null ? "" : req.targetType().trim().toUpperCase();
        String reason = req.reason() == null ? "" : req.reason().trim().toLowerCase();
        if (!TARGETS.contains(type)) throw ApiException.badRequest("Unknown report target");
        if (!REASONS.contains(reason)) throw ApiException.badRequest("Choose a reason for the report");
        if (req.targetId() == null) throw ApiException.badRequest("Missing target");
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatus(me, type, req.targetId(), "open")) {
            return; // already reported and still open: don't duplicate
        }
        Report r = new Report();
        r.setReporterId(me);
        r.setTargetType(type);
        r.setTargetId(req.targetId());
        r.setReason(reason);
        r.setDetails(req.details() == null || req.details().isBlank() ? null : req.details().trim());
        reportRepository.save(r);
        String[] lp = labelAndPath(type, req.targetId());
        notificationService.adminAlert("New report: " + reason + " — " + lp[0], List.of(
                "A member reported " + type.toLowerCase() + " “" + lp[0] + "” for " + reason + "."
                        + (r.getDetails() != null ? "\n\n“" + r.getDetails() + "”" : "")), "/admin");
    }

    public List<ReportDto> adminList() {
        return reportRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 200)).stream().map(r -> {
            String[] lp = labelAndPath(r.getTargetType(), r.getTargetId());
            String reporter = profileRepository.findById(r.getReporterId()).map(Profile::getDisplayName).orElse(null);
            return new ReportDto(r.getId(), r.getTargetType(), r.getTargetId(), lp[0], lp[1], r.getReason(), r.getDetails(),
                    r.getStatus(), r.getAdminNote(), r.getReporterId(), reporter, r.getCreatedAt(), r.getResolvedAt());
        }).toList();
    }

    @Transactional
    public void resolve(UUID id, ResolveRequest req) {
        Report r = reportRepository.findById(id).orElseThrow(() -> ApiException.notFound("Report not found"));
        String status = req.status() == null ? "" : req.status().trim().toLowerCase();
        if (!Set.of("resolved", "dismissed").contains(status)) throw ApiException.badRequest("Status must be resolved or dismissed");
        r.setStatus(status);
        r.setAdminNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        r.setResolvedAt(Instant.now());
        reportRepository.save(r);
        auditService.record("REPORT_" + status.toUpperCase(), r.getTargetType(), r.getTargetId(), r.getReason(), r.getAdminNote());
    }

    private String[] labelAndPath(String type, UUID id) {
        return switch (type) {
            case "ARTWORK" -> artworkRepository.findById(id).map(a -> new String[]{a.getTitle(), "/artworks/" + a.getSlug()}).orElse(gone());
            case "SUPPLY" -> supplyRepository.findById(id).map(s -> new String[]{s.getName(), "/supplies/" + s.getSlug()}).orElse(gone());
            case "CLASS" -> classRepository.findById(id).map(c -> new String[]{c.getTitle(), "/classes/" + c.getSlug()}).orElse(gone());
            case "EXHIBITION" -> exhibitionRepository.findById(id).map(e -> new String[]{e.getTitle(), "/exhibitions/" + e.getSlug()}).orElse(gone());
            case "USER" -> profileRepository.findById(id).map(p -> new String[]{p.getDisplayName(), "/artists/" + p.getId()}).orElse(gone());
            default -> new String[]{type.toLowerCase() + " " + id.toString().substring(0, 8), null};
        };
    }

    private static String[] gone() {
        return new String[]{"(removed)", null};
    }

    // ---------- blocks

    @Transactional
    public void block(UUID userId) {
        UUID me = SecurityUtils.currentUserId();
        if (me.equals(userId)) throw ApiException.badRequest("You can't block yourself");
        if (!profileRepository.existsById(userId)) throw ApiException.notFound("Member not found");
        jdbc.update("insert into user_blocks (blocker_id, blocked_id) values (?, ?) on conflict do nothing", me, userId);
    }

    @Transactional
    public void unblock(UUID userId) {
        jdbc.update("delete from user_blocks where blocker_id = ? and blocked_id = ?", SecurityUtils.currentUserId(), userId);
    }

    public List<BlockedUserDto> blocked() {
        List<UUID> ids = jdbc.queryForList("select blocked_id from user_blocks where blocker_id = ? order by created_at desc",
                UUID.class, SecurityUtils.currentUserId());
        return profileRepository.findByIdIn(ids).stream()
                .map(p -> new BlockedUserDto(p.getId(), p.getDisplayName(), p.getAvatarUrl())).toList();
    }

    /** True if either member has blocked the other. */
    public boolean blockedEitherWay(UUID a, UUID b) {
        Long n = jdbc.queryForObject("select count(*) from user_blocks where (blocker_id = ? and blocked_id = ?) or (blocker_id = ? and blocked_id = ?)",
                Long.class, a, b, b, a);
        return n != null && n > 0;
    }
}
