package com.yko.calendar.vacations;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WorkingDayCalculatorTest {

    private static final Set<LocalDate> NONE = Set.of();

    @Test
    void fullWorkWeekHasFiveDays() {
        assertEquals(
                5,
                WorkingDayCalculator.count(
                        LocalDate.of(2026, 10, 19),
                        LocalDate.of(2026, 10, 23),
                        NONE
                )
        );
    }

    @Test
    void weekendsAreExcluded() {
        assertEquals(
                10,
                WorkingDayCalculator.count(
                        LocalDate.of(2026, 10, 19),
                        LocalDate.of(2026, 10, 30),
                        NONE
                )
        );
        assertEquals(
                0,
                WorkingDayCalculator.count(
                        LocalDate.of(2026, 10, 24),
                        LocalDate.of(2026, 10, 25),
                        NONE
                )
        );
    }

    @Test
    void singleWorkingDayCountsOne() {
        LocalDate monday = LocalDate.of(2026, 10, 19);

        assertEquals(1, WorkingDayCalculator.count(monday, monday, NONE));
    }

    @Test
    void holidayOnAWeekdayIsExcluded() {
        assertEquals(
                4,
                WorkingDayCalculator.count(
                        LocalDate.of(2026, 10, 19),
                        LocalDate.of(2026, 10, 23),
                        Set.of(LocalDate.of(2026, 10, 21))
                )
        );
    }

    @Test
    void holidayOnAWeekendIsNotCountedTwice() {
        assertEquals(
                5,
                WorkingDayCalculator.count(
                        LocalDate.of(2026, 10, 19),
                        LocalDate.of(2026, 10, 25),
                        Set.of(LocalDate.of(2026, 10, 24))
                )
        );
    }

    @Test
    void rangeCrossingTheYearIsSupported() {
        assertEquals(
                2,
                WorkingDayCalculator.count(
                        LocalDate.of(2026, 12, 31),
                        LocalDate.of(2027, 1, 1),
                        NONE
                )
        );
    }

    @Test
    void holidayCoveringTheWholePeriodLeavesZero() {
        LocalDate day = LocalDate.of(2026, 12, 25);

        assertEquals(0, WorkingDayCalculator.count(day, day, Set.of(day)));
    }
}
