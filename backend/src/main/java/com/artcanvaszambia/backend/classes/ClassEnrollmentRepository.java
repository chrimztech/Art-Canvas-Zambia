package com.artcanvaszambia.backend.classes;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassEnrollmentRepository extends JpaRepository<ClassEnrollment, UUID> {
    boolean existsByClassIdAndStudentId(UUID classId, UUID studentId);

    List<ClassEnrollment> findByClassId(UUID classId);

    List<ClassEnrollment> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    Optional<ClassEnrollment> findByOrderItemId(UUID orderItemId);
}
