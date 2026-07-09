package com.artcanvaszambia.backend.exhibitions.dto;

import jakarta.validation.constraints.Positive;

public record TicketRequest(@Positive int quantity) {
}
