package com.yko.calendar.holidays;

import java.time.LocalDate;
import java.util.UUID;

public record HolidayResponse(
        UUID id,
        LocalDate date,
        String name,
        HolidayScope scope,
        String location
) {

    public static HolidayResponse from(Holiday holiday) {
        return new HolidayResponse(
                holiday.getId(),
                holiday.getDate(),
                holiday.getName(),
                holiday.getScope(),
                holiday.getLocation()
        );
    }
}
