package com.yko.calendar.vacations;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VacationCancellationRepository
        extends JpaRepository<VacationCancellation, UUID> {

    List<VacationCancellation> findAllByOrderByCreatedAtDesc();

    List<VacationCancellation> findByUserIdOrderByCreatedAtDesc(UUID userId);

    boolean existsByVacationIdAndStatus(UUID vacationId, CancellationStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from VacationCancellation c where c.id = :id")
    Optional<VacationCancellation> findByIdForUpdate(@Param("id") UUID id);
}
