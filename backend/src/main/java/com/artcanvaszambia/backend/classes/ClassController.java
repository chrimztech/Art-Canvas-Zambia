package com.artcanvaszambia.backend.classes;

import com.artcanvaszambia.backend.classes.dto.ClassDto;
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

    @GetMapping("/api/me/enrollments")
    public List<EnrollmentDto> myEnrollments() {
        return classService.myEnrollments();
    }
}
