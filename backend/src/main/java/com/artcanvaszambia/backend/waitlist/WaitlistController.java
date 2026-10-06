package com.artcanvaszambia.backend.waitlist;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class WaitlistController {
    private final WaitlistService waitlistService;

    @PutMapping("/api/me/waitlist/{itemType}/{itemId}")
    public void join(@PathVariable String itemType, @PathVariable UUID itemId) {
        waitlistService.join(itemType, itemId);
    }

    @DeleteMapping("/api/me/waitlist/{itemType}/{itemId}")
    public void leave(@PathVariable String itemType, @PathVariable UUID itemId) {
        waitlistService.leave(itemType, itemId);
    }

    @GetMapping("/api/me/waitlist")
    public List<WaitlistService.WaitlistDto> mine() {
        return waitlistService.mine();
    }
}
