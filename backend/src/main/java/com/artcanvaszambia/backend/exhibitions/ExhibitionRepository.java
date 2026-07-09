package com.artcanvaszambia.backend.exhibitions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExhibitionRepository extends JpaRepository<Exhibition, UUID> {
    Optional<Exhibition> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Exhibition> findByStatusOrderByStartsAt(String status);

    List<Exhibition> findByOrganizerIdOrderByStartsAtDesc(UUID organizerId);
}
