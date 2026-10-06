package com.artcanvaszambia.backend.reviews;

import com.artcanvaszambia.backend.reviews.dto.ReviewDtos.ReplyRequest;
import com.artcanvaszambia.backend.reviews.dto.ReviewDtos.ReviewDto;
import com.artcanvaszambia.backend.reviews.dto.ReviewDtos.ReviewRequest;
import com.artcanvaszambia.backend.reviews.dto.ReviewDtos.ReviewSummaryDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ReviewController {
    private final ReviewService reviewService;

    @PostMapping("/api/reviews")
    public ReviewDto submit(@Valid @RequestBody ReviewRequest req) {
        return reviewService.submit(req);
    }

    @PostMapping("/api/reviews/{id}/reply")
    public ReviewDto reply(@PathVariable UUID id, @Valid @RequestBody ReplyRequest req) {
        return reviewService.reply(id, req.reply());
    }

    @GetMapping("/api/reviews/seller/{sellerId}")
    public ReviewSummaryDto seller(@PathVariable UUID sellerId) {
        return reviewService.sellerSummary(sellerId);
    }

    @GetMapping("/api/reviews/listing/{referenceId}")
    public List<ReviewDto> listing(@PathVariable UUID referenceId) {
        return reviewService.forListing(referenceId);
    }

    @GetMapping("/api/admin/reviews")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<ReviewDto> adminList() {
        return reviewService.adminLatest();
    }

    @DeleteMapping("/api/admin/reviews/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public void adminDelete(@PathVariable UUID id) {
        reviewService.adminDelete(id);
    }
}
