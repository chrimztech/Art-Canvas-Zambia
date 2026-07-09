package com.artcanvaszambia.backend.classes;

import com.artcanvaszambia.backend.classes.dto.ClassDto;
import com.artcanvaszambia.backend.classes.dto.ClassRequest;
import com.artcanvaszambia.backend.classes.dto.EnrollmentDto;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.common.SlugUtil;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassService {
    private final ClassRepository classRepository;
    private final ClassEnrollmentRepository enrollmentRepository;
    private final ProfileRepository profileRepository;

    public List<ClassDto> listPublished() {
        return classRepository.findByStatusOrderByStartsAt(ClassEntity.PUBLISHED).stream().map(this::toDto).toList();
    }

    public List<ClassDto> mine() {
        return classRepository.findByInstructorIdOrderByStartsAtDesc(SecurityUtils.currentUserId())
                .stream().map(this::toDto).toList();
    }

    public ClassDto getBySlug(String slug) {
        ClassEntity c = classRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Class not found"));
        return toDto(c);
    }

    @Transactional
    public ClassDto create(ClassRequest req) {
        var principal = SecurityUtils.currentPrincipal();
        ClassEntity c = new ClassEntity();
        c.setInstructorId(principal.getId());
        applyRequest(c, req);
        c.setSlug(SlugUtil.uniqueSlug(req.title(), classRepository::existsBySlug));
        c.setStatus(ClassEntity.PUBLISHED);
        classRepository.save(c);
        return toDto(c);
    }

    private void applyRequest(ClassEntity c, ClassRequest req) {
        c.setTitle(req.title());
        c.setDescription(req.description());
        c.setCoverImageUrl(req.coverImageUrl());
        c.setMode(req.mode() != null ? req.mode() : "in_person");
        c.setLocation(req.location());
        c.setMeetingUrl(req.meetingUrl());
        c.setStartsAt(req.startsAt());
        c.setEndsAt(req.endsAt());
        c.setCapacity(req.capacity() != null ? req.capacity() : 10);
        c.setPriceZmw(req.priceZmw() != null ? req.priceZmw() : BigDecimal.ZERO);
        c.setSkillLevel(req.skillLevel());
        c.setPrerequisites(req.prerequisites());
        c.setSyllabus(req.syllabus());
        c.setTags(req.tags() != null ? req.tags() : List.of());
        c.setMaterialsIncluded(req.materialsIncluded() != null && req.materialsIncluded());
    }

    @Transactional
    public ClassDto update(UUID id, ClassRequest req) {
        ClassEntity c = classRepository.findById(id).orElseThrow(() -> ApiException.notFound("Class not found"));
        SecurityUtils.requireOwnerOrAdmin(c.getInstructorId());
        applyRequest(c, req);
        classRepository.save(c);
        return toDto(c);
    }

    @Transactional
    public void delete(UUID id) {
        ClassEntity c = classRepository.findById(id).orElseThrow(() -> ApiException.notFound("Class not found"));
        SecurityUtils.requireOwnerOrAdmin(c.getInstructorId());
        classRepository.delete(c);
    }

    public List<EnrollmentDto> myEnrollments() {
        UUID studentId = SecurityUtils.currentUserId();
        List<ClassEnrollment> enrollments = enrollmentRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
        Map<UUID, ClassEntity> classes = classRepository.findAllById(
                        enrollments.stream().map(ClassEnrollment::getClassId).distinct().toList()).stream()
                .collect(Collectors.toMap(ClassEntity::getId, c -> c));
        return enrollments.stream().map(e -> {
            ClassEntity c = classes.get(e.getClassId());
            return new EnrollmentDto(e.getId(), e.getClassId(), c != null ? c.getTitle() : null,
                    c != null ? c.getSlug() : null, c != null ? c.getCoverImageUrl() : null,
                    c != null ? c.getStartsAt() : null, c != null ? c.getEndsAt() : null,
                    e.getStatus(), e.getAmountPaidZmw(), e.getCreatedAt());
        }).toList();
    }

    @Transactional
    public void enroll(UUID classId) {
        UUID studentId = SecurityUtils.currentUserId();
        if (!classRepository.existsById(classId)) {
            throw ApiException.notFound("Class not found");
        }
        if (enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)) {
            throw ApiException.conflict("You're already enrolled in this class");
        }
        ClassEnrollment e = new ClassEnrollment();
        e.setClassId(classId);
        e.setStudentId(studentId);
        e.setStatus("pending");
        enrollmentRepository.save(e);
    }

    private ClassDto toDto(ClassEntity c) {
        Profile p = profileRepository.findById(c.getInstructorId()).orElse(null);
        return new ClassDto(c.getId(), c.getSlug(), c.getTitle(), c.getDescription(), c.getCoverImageUrl(),
                c.getMode(), c.getLocation(), c.getMeetingUrl(), c.getStartsAt(), c.getEndsAt(), c.getCapacity(),
                c.getPriceZmw(), c.getStatus(), c.getInstructorId(), p != null ? p.getDisplayName() : null,
                c.getSkillLevel(), c.getPrerequisites(), c.getSyllabus(), c.getTags(), c.isMaterialsIncluded());
    }
}
