package com.artcanvaszambia.backend.catalog;

import java.util.UUID;

/** Raised when an artwork is (or becomes) published, so followers and alerts can be told about it. */
public record ArtworkPublishedEvent(UUID artworkId) {
}
