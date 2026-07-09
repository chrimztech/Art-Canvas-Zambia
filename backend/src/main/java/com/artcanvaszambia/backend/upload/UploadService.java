package com.artcanvaszambia.backend.upload;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.upload.dto.UploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
@RequiredArgsConstructor
public class UploadService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.upload.public-base-url}")
    private String publicBaseUrl;

    public UploadResponse store(MultipartFile file) {
        if (file.isEmpty()) {
            throw ApiException.badRequest("No file provided");
        }
        String userId = SecurityUtils.currentUserId().toString();
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
        String sanitized = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String filename = System.currentTimeMillis() + "-" + sanitized;

        try {
            Path userDir = Path.of(uploadDir, userId);
            Files.createDirectories(userDir);
            Path target = userDir.resolve(filename);
            file.transferTo(target);
        } catch (IOException e) {
            throw ApiException.badRequest("Could not save file: " + e.getMessage());
        }

        String url = publicBaseUrl + "/" + userId + "/" + filename;
        return new UploadResponse(url);
    }
}
