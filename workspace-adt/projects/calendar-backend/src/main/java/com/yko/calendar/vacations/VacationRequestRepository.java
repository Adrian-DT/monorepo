package com.yko.calendar.vacations;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VacationRequestRepository
        extends JpaRepository<VacationRequest, UUID> {

    List<VacationRequest> findAllByOrderByStartDateDescCreatedAtDesc();

    List<VacationRequest> findByUserIdOrStatusOrderByStartDateDescCreatedAtDesc(
            UUID userId,
            VacationStatus status
    );

    @Query("""
            select count(v) > 0 from VacationRequest v
            where v.userId = :userId
              and v.status in :statuses
              and v.startDate <= :endDate
              and v.endDate >= :startDate
            """)
    boolean existsOverlap(
            @Param("userId") UUID userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") Collection<VacationStatus> statuses
    );
}
