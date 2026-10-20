package com.yko.calendar.vacations;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CancellationDecisionRequest(
        @NotNull VacationDecision decision,
        @Size(max = 500) String comment
) {
}
