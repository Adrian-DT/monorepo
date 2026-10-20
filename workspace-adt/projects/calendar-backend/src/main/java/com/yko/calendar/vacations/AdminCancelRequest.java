package com.yko.calendar.vacations;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AdminCancelRequest(
        LocalDate fromDate,
        LocalDate toDate,
        @Size(max = 500) String comment
) {

    @JsonIgnore
    @AssertTrue(message = "fromDate and toDate must be sent together and fromDate must not be after toDate")
    public boolean isRangeValid() {
        if (fromDate == null && toDate == null) {
            return true;
        }

        return fromDate != null && toDate != null && !toDate.isBefore(fromDate);
    }
}
