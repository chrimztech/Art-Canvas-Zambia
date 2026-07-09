package com.artcanvaszambia.backend.common;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.function.Predicate;
import java.util.regex.Pattern;

public final class SlugUtil {
    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]+");
    private static final SecureRandom RANDOM = new SecureRandom();

    private SlugUtil() {
    }

    public static String slugify(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String noWhitespace = WHITESPACE.matcher(normalized.trim()).replaceAll("-");
        String slug = NON_LATIN.matcher(noWhitespace).replaceAll("").toLowerCase();
        return slug.isBlank() ? "item" : slug;
    }

    /** Appends a short random suffix until {@code isTaken} reports the slug is free. */
    public static String uniqueSlug(String base, Predicate<String> isTaken) {
        String slug = slugify(base);
        String candidate = slug;
        while (isTaken.test(candidate)) {
            candidate = slug + "-" + Integer.toHexString(RANDOM.nextInt(0xFFFFFF));
        }
        return candidate;
    }
}
