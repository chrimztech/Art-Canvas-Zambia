package com.artcanvaszambia.backend.audit;

import com.artcanvaszambia.backend.audit.dto.AuditLogDto;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {
    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void record(String action, String targetType, UUID targetId, String targetLabel, String details) {
        try {
            AuditLogEntity entry = new AuditLogEntity();
            try {
                var principal = SecurityUtils.currentPrincipal();
                entry.setActorId(principal.getId());
                entry.setActorLabel(principal.getUsername());
            } catch (Exception ignored) {
                // no authenticated actor (e.g. system action) - leave actor fields null
            }
            entry.setAction(action);
            entry.setTargetType(targetType);
            entry.setTargetId(targetId);
            entry.setTargetLabel(targetLabel);
            entry.setDetails(details);
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Failed to record audit log entry for action {}: {}", action, ex.getMessage());
        }
    }

    public List<AuditLogDto> recent(int limit) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit)).stream()
                .map(e -> new AuditLogDto(e.getId(), e.getActorId(), e.getActorLabel(), e.getAction(),
                        e.getTargetType(), e.getTargetId(), e.getTargetLabel(), e.getDetails(), e.getCreatedAt()))
                .toList();
    }
}
