package com.artcanvaszambia.backend.classes;

import com.artcanvaszambia.backend.admin.dto.StatusUpdateRequest;
import com.artcanvaszambia.backend.classes.dto.ClassDto;
import com.artcanvaszambia.backend.common.dto.AttendeeDto;
import com.artcanvaszambia.backend.classes.dto.ClassRequest;
import com.artcanvaszambia.backend.classes.dto.EnrollmentDto;
import com.artcanvaszambia.backend.orders.CheckoutService;
import com.artcanvaszambia.backend.orders.OrderItem;
import com.artcanvaszambia.backend.orders.dto.CheckoutRequest;
import com.artcanvaszambia.backend.orders.dto.CheckoutResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ClassController {
    private final ClassService classService;
    private final CheckoutService checkoutService;

    @GetMapping("/api/classes")
    public List<ClassDto> list() {
        return classService.listPublished();
    }

    @GetMapping("/api/classes/{slug}")
    public ClassDto get(@PathVariable String slug) {
        return classService.getBySlug(slug);
    }

    @GetMapping("/api/me/classes")
    public List<ClassDto> mine() {
        return classService.mine();
    }

    @PostMapping("/api/classes")
    public ClassDto create(@Valid @RequestBody ClassRequest req) {
        return classService.create(req);
    }

    @PutMapping("/api/classes/{id}")
    public ClassDto update(@PathVariable UUID id, @Valid @RequestBody ClassRequest req) {
        return classService.update(id, req);
    }

    @DeleteMapping("/api/classes/{id}")
    public void delete(@PathVariable UUID id) {
        classService.delete(id);
    }

    @PostMapping("/api/classes/{id}/enroll")
    public void enroll(@PathVariable UUID id) {
        classService.enroll(id);
    }

    @PostMapping("/api/classes/{id}/checkout")
    public CheckoutResponse checkout(@PathVariable UUID id, @Valid @RequestBody CheckoutRequest req) {
        return checkoutService.checkoutSingleItem(OrderItem.CLASS, id, 1, req);
    }

    @PatchMapping("/api/classes/{id}/status")
    public ClassDto updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest req) {
        return classService.updateStatus(id, req.status());
    }

    @GetMapping("/api/classes/{id}/enrollments")
    public List<AttendeeDto> roster(@PathVariable UUID id) {
        return classService.roster(id);
    }

    @PostMapping("/api/classes/enrollments/{enrollmentId}/attended")
    public void markAttended(@PathVariable UUID enrollmentId) {
        classService.markAttended(enrollmentId);
    }

    @GetMapping("/api/me/enrollments")
    public List<EnrollmentDto> myEnrollments() {
        return classService.myEnrollments();
    }
}
