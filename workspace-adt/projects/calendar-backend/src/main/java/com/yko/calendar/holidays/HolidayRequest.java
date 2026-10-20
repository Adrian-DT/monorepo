package com.yko.calendar.holidays;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record HolidayRequest(
        @NotNull LocalDate date,
        @NotBlank @Size(max = 120) String name,
        @NotNull HolidayScope scope,
        @Size(max = 120) String location
) {

    @JsonIgnore
    @AssertTrue(message = "date must be between 2000 and 2100")
    public boolean isDateInRange() {
        return date == null || (date.getYear() >= 2000 && date.getYear() <= 2100);
    }
}
