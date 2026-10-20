package com.yko.calendar.holidays;

import java.util.UUID;

public class HolidayNotFoundException extends RuntimeException {

    public HolidayNotFoundException(UUID id) {
        super("Holiday " + id + " not found");
    }
}
