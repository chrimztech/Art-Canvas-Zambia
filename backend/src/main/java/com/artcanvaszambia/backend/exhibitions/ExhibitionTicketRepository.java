package com.artcanvaszambia.backend.exhibitions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExhibitionTicketRepository extends JpaRepository<ExhibitionTicket, UUID> {
    List<ExhibitionTicket> findByExhibitionId(UUID exhibitionId);

    List<ExhibitionTicket> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    Optional<ExhibitionTicket> findByOrderItemId(UUID orderItemId);
}
