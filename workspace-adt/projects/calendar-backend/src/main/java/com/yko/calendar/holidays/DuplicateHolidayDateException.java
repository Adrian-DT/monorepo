package com.yko.calendar.holidays;

import java.time.LocalDate;

public class DuplicateHolidayDateException extends RuntimeException {

    public DuplicateHolidayDateException(LocalDate date) {
        super("A holiday already exists for " + date);
    }
}
