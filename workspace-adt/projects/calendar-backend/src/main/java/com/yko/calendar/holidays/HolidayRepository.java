package com.yko.calendar.holidays;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HolidayRepository extends JpaRepository<Holiday, UUID> {

    List<Holiday> findAllByOrderByDateAsc();

    Optional<Holiday> findByDate(LocalDate date);

    List<Holiday> findByDateBetween(LocalDate from, LocalDate to);
}
