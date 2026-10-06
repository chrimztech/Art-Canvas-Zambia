package com.artcanvaszambia.backend.exhibitions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExhibitionTicketRepository extends JpaRepository<ExhibitionTicket, UUID> {
    List<ExhibitionTicket> findByExhibitionId(UUID exhibitionId);

    List<ExhibitionTicket> findByExhibitionIdOrderByCreatedAtAsc(UUID exhibitionId);

    List<ExhibitionTicket> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    Optional<ExhibitionTicket> findByOrderItemId(UUID orderItemId);

    @Query("select coalesce(sum(t.quantity), 0) from ExhibitionTicket t "
            + "where t.exhibitionId = :exhibitionId and t.status in :statuses")
    long sumQuantityByExhibitionIdAndStatusIn(@Param("exhibitionId") UUID exhibitionId,
                                              @Param("statuses") Collection<String> statuses);
}
