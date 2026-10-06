package com.artcanvaszambia.backend.waitlist;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WaitlistRepository extends JpaRepository<WaitlistEntry, UUID> {
    Optional<WaitlistEntry> findByUserIdAndItemTypeAndItemId(UUID userId, String itemType, UUID itemId);

    List<WaitlistEntry> findByItemTypeAndItemIdAndNotifiedAtIsNullOrderByCreatedAtAsc(String itemType, UUID itemId);

    List<WaitlistEntry> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByItemTypeAndItemId(String itemType, UUID itemId);

    @Transactional
    void deleteByUserIdAndItemTypeAndItemId(UUID userId, String itemType, UUID itemId);
}
