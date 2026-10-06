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
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UploadService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.upload.public-base-url}")
    private String publicBaseUrl;

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");

    public UploadResponse store(MultipartFile file) {
        if (file.isEmpty()) {
            throw ApiException.badRequest("No file provided");
        }
        // Uploads are served from the API origin, so only accept image types to rule out stored HTML/SVG/script content.
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String extension = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED_TYPES.contains(contentType) || !ALLOWED_EXTENSIONS.contains(extension)) {
            throw ApiException.badRequest("Only JPG, PNG, WEBP or GIF images can be uploaded");
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
