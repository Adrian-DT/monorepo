package com.yko.calendar.vacations;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

public final class WorkingDayCalculator {

    private WorkingDayCalculator() {
    }

    public static int count(
            LocalDate start,
            LocalDate end,
            Set<LocalDate> holidays
    ) {
        int days = 0;

        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            DayOfWeek weekday = day.getDayOfWeek();
            boolean weekend = weekday == DayOfWeek.SATURDAY
                    || weekday == DayOfWeek.SUNDAY;

            if (!weekend && !holidays.contains(day)) {
                days++;
            }
        }

        return days;
    }
}
