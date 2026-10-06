package com.artcanvaszambia.backend.classes;

import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.classes.dto.ClassDto;
import com.artcanvaszambia.backend.classes.dto.ClassRequest;
import com.artcanvaszambia.backend.classes.dto.EnrollmentDto;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.common.SlugUtil;
import com.artcanvaszambia.backend.common.dto.AttendeeDto;
import com.artcanvaszambia.backend.orders.CheckoutService;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.AppUserPrincipal;
import com.artcanvaszambia.backend.security.Role;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassService {
    private static final Set<String> OWNER_STATUSES = Set.of(ClassEntity.DRAFT, ClassEntity.PUBLISHED,
            ClassEntity.CANCELLED, ClassEntity.COMPLETED);
    private static final Set<String> MODES = Set.of("online", "in_person", "hybrid");
    private static final Set<String> SKILL_LEVELS = Set.of("beginner", "intermediate", "advanced");

    private final ClassRepository classRepository;
    private final ClassEnrollmentRepository enrollmentRepository;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final CheckoutService checkoutService;

    public List<ClassDto> listPublished() {
        return classRepository.findByStatusOrderByStartsAt(ClassEntity.PUBLISHED).stream().map(this::toDto).toList();
    }

    public List<ClassDto> mine() {
        return classRepository.findByInstructorIdOrderByStartsAtDesc(SecurityUtils.currentUserId())
                .stream().map(this::toDto).toList();
    }

    public ClassDto getBySlug(String slug) {
        ClassEntity c = classRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Class not found"));
        if (ClassEntity.DRAFT.equals(c.getStatus()) && !SecurityUtils.isOwnerOrAdmin(c.getInstructorId())) {
            throw ApiException.notFound("Class not found");
        }
        return toDto(c);
    }

    @Transactional
    public ClassDto create(ClassRequest req) {
        SecurityUtils.requireAnyRole("Enable instructor tools from your dashboard to publish classes", Role.INSTRUCTOR);
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
        if (!req.endsAt().isAfter(req.startsAt())) {
            throw ApiException.badRequest("The class must end after it starts");
        }
        if (req.capacity() != null && req.capacity() < 1) {
            throw ApiException.badRequest("Capacity must be at least 1");
        }
        if (req.priceZmw() != null && req.priceZmw().signum() < 0) {
            throw ApiException.badRequest("Price can't be negative");
        }
        String mode = req.mode() != null ? req.mode() : "in_person";
        if (!MODES.contains(mode)) {
            throw ApiException.badRequest("Unknown class mode");
        }
        String skillLevel = req.skillLevel() == null || req.skillLevel().isBlank() ? null : req.skillLevel();
        if (skillLevel != null && !SKILL_LEVELS.contains(skillLevel)) {
            throw ApiException.badRequest("Unknown skill level");
        }
        c.setTitle(req.title());
        c.setDescription(req.description());
        c.setCoverImageUrl(req.coverImageUrl());
        c.setMode(mode);
        c.setLocation(req.location());
        c.setMeetingUrl(req.meetingUrl());
        c.setStartsAt(req.startsAt());
        c.setEndsAt(req.endsAt());
        c.setCapacity(req.capacity() != null ? req.capacity() : 10);
        c.setPriceZmw(req.priceZmw() != null ? req.priceZmw() : BigDecimal.ZERO);
        c.setSkillLevel(skillLevel);
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
    public ClassDto updateStatus(UUID id, String status) {
        ClassEntity c = classRepository.findById(id).orElseThrow(() -> ApiException.notFound("Class not found"));
        SecurityUtils.requireOwnerOrAdmin(c.getInstructorId());
        String normalized = status == null ? "" : status.trim().toLowerCase();
        if (!OWNER_STATUSES.contains(normalized)) {
            throw ApiException.badRequest("Invalid class status");
        }
        c.setStatus(normalized);
        classRepository.save(c);
        return toDto(c);
    }

    @Transactional
    public void delete(UUID id) {
        ClassEntity c = classRepository.findById(id).orElseThrow(() -> ApiException.notFound("Class not found"));
        SecurityUtils.requireOwnerOrAdmin(c.getInstructorId());
        if (enrollmentRepository.countByClassIdAndStatusIn(id, CheckoutService.SEAT_HOLDING_STATUSES) > 0) {
            throw ApiException.conflict("Students are enrolled in this class. Cancel it instead of deleting it.");
        }
        classRepository.delete(c);
    }

    public List<EnrollmentDto> myEnrollments() {
        UUID studentId = SecurityUtils.currentUserId();
        List<ClassEnrollment> enrollments = enrollmentRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
        Map<UUID, ClassEntity> classes = classRepository.findAllById(
                        enrollments.stream().map(ClassEnrollment::getClassId).distinct().toList()).stream()
                .collect(Collectors.toMap(ClassEntity::getId, c -> c));
        Map<UUID, Profile> instructors = profileRepository.findByIdIn(
                        classes.values().stream().map(ClassEntity::getInstructorId).distinct().toList()).stream()
                .collect(Collectors.toMap(Profile::getId, Function.identity()));
        return enrollments.stream().map(e -> {
            ClassEntity c = classes.get(e.getClassId());
            boolean confirmed = CheckoutService.SEAT_HOLDING_STATUSES.contains(e.getStatus());
            Profile instructor = c != null ? instructors.get(c.getInstructorId()) : null;
            return new EnrollmentDto(e.getId(), e.getClassId(), c != null ? c.getTitle() : null,
                    c != null ? c.getSlug() : null, c != null ? c.getCoverImageUrl() : null,
                    c != null ? c.getStartsAt() : null, c != null ? c.getEndsAt() : null,
                    e.getStatus(), e.getAmountPaidZmw(), e.getCreatedAt(),
                    c != null ? c.getMode() : null, c != null ? c.getLocation() : null,
                    c != null && confirmed ? c.getMeetingUrl() : null,
                    instructor != null ? instructor.getDisplayName() : null);
        }).toList();
    }

    /** Free classes confirm the seat immediately; paid classes go through checkout. */
    @Transactional
    public void enroll(UUID classId) {
        UUID studentId = SecurityUtils.currentUserId();
        ClassEntity c = classRepository.findById(classId).orElseThrow(() -> ApiException.notFound("Class not found"));
        if (c.getPriceZmw() != null && c.getPriceZmw().signum() > 0) {
            throw ApiException.badRequest("This is a paid class. Please complete checkout to enroll.");
        }
        checkoutService.requireClassBookable(c, studentId);
        ClassEnrollment e = enrollmentRepository.findByClassIdAndStudentId(classId, studentId).orElseGet(() -> {
            ClassEnrollment created = new ClassEnrollment();
            created.setClassId(classId);
            created.setStudentId(studentId);
            return created;
        });
        e.setStatus("paid");
        e.setAmountPaidZmw(BigDecimal.ZERO);
        enrollmentRepository.save(e);
    }

    /** The instructor's view of who is enrolled. */
    public List<AttendeeDto> roster(UUID classId) {
        ClassEntity c = classRepository.findById(classId).orElseThrow(() -> ApiException.notFound("Class not found"));
        SecurityUtils.requireOwnerOrAdmin(c.getInstructorId());
        List<ClassEnrollment> enrollments = enrollmentRepository.findByClassIdOrderByCreatedAtAsc(classId);
        List<UUID> studentIds = enrollments.stream().map(ClassEnrollment::getStudentId).distinct().toList();
        Map<UUID, Profile> profiles = profileRepository.findByIdIn(studentIds).stream()
                .collect(Collectors.toMap(Profile::getId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return enrollments.stream().map(e -> {
            Profile p = profiles.get(e.getStudentId());
            User u = users.get(e.getStudentId());
            return new AttendeeDto(e.getId(), e.getStudentId(), p != null ? p.getDisplayName() : null,
                    u != null ? u.getEmail() : null, e.getStatus(), 1, e.getAmountPaidZmw(), e.getCreatedAt(), null);
        }).toList();
    }

    /** Instructor marks a confirmed student as having attended. */
    @Transactional
    public void markAttended(UUID enrollmentId) {
        ClassEnrollment e = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> ApiException.notFound("Enrollment not found"));
        ClassEntity c = classRepository.findById(e.getClassId()).orElseThrow(() -> ApiException.notFound("Class not found"));
        SecurityUtils.requireOwnerOrAdmin(c.getInstructorId());
        if (!"paid".equals(e.getStatus())) {
            throw ApiException.badRequest("Only confirmed students can be marked as attended");
        }
        e.setStatus("attended");
        enrollmentRepository.save(e);
    }

    private ClassDto toDto(ClassEntity c) {
        Profile p = profileRepository.findById(c.getInstructorId()).orElse(null);
        long enrolledCount = enrollmentRepository.countByClassIdAndStatusIn(c.getId(), CheckoutService.SEAT_HOLDING_STATUSES);
        AppUserPrincipal viewer = SecurityUtils.currentPrincipalOrNull();
        boolean enrolled = viewer != null && enrollmentRepository.existsByClassIdAndStudentIdAndStatusIn(
                c.getId(), viewer.getId(), CheckoutService.SEAT_HOLDING_STATUSES);
        boolean canSeeMeetingUrl = enrolled || SecurityUtils.isOwnerOrAdmin(c.getInstructorId());
        return new ClassDto(c.getId(), c.getSlug(), c.getTitle(), c.getDescription(), c.getCoverImageUrl(),
                c.getMode(), c.getLocation(), canSeeMeetingUrl ? c.getMeetingUrl() : null, c.getStartsAt(), c.getEndsAt(),
                c.getCapacity(), c.getPriceZmw(), c.getStatus(), c.getInstructorId(), p != null ? p.getDisplayName() : null,
                c.getSkillLevel(), c.getPrerequisites(), c.getSyllabus(), c.getTags(), c.isMaterialsIncluded(),
                enrolledCount, enrolled);
    }
}
