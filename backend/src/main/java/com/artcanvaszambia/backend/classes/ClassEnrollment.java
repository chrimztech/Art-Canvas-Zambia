package com.artcanvaszambia.backend.classes;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "class_enrollments", uniqueConstraints = @UniqueConstraint(columnNames = {"class_id", "student_id"}))
@Getter
@Setter
@NoArgsConstructor
public class ClassEnrollment {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "class_id", nullable = false)
    private UUID classId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(nullable = false)
    private String status = "pending";

    @Column(name = "amount_paid_zmw", precision = 12, scale = 2)
    private BigDecimal amountPaidZmw;

    @Column(name = "order_item_id")
    private UUID orderItemId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
