package com.artcanvaszambia.backend.upload;

import com.artcanvaszambia.backend.upload.dto.UploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class UploadController {
    private final UploadService uploadService;

    @PostMapping(value = "/api/uploads", consumes = "multipart/form-data")
    public UploadResponse upload(@RequestParam("file") MultipartFile file) {
        return uploadService.store(file);
    }
}
