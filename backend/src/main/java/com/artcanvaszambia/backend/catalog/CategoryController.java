package com.artcanvaszambia.backend.catalog;

import com.artcanvaszambia.backend.catalog.dto.CategoryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryRepository categoryRepository;

    @GetMapping("/api/categories")
    public List<CategoryDto> list() {
        return categoryRepository.findAll(Sort.by("sortOrder")).stream().map(CategoryDto::from).toList();
    }
}
