package com.artcanvaszambia.backend.classes;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassRepository extends JpaRepository<ClassEntity, UUID> {
    Optional<ClassEntity> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<ClassEntity> findByStatusOrderByStartsAt(String status);

    List<ClassEntity> findByInstructorIdOrderByStartsAtDesc(UUID instructorId);
}
