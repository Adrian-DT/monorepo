package com.yko.calendar.vacations;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record VacationCreateRequest(
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotBlank @Size(max = 250) String reason
) {

    @JsonIgnore
    @AssertTrue(message = "endDate must not be before startDate")
    public boolean isDateRangeValid() {
        return startDate == null || endDate == null || !endDate.isBefore(startDate);
    }
}
