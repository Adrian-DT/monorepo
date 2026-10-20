package com.yko.calendar.vacations;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record VacationDecisionRequest(
        @NotNull VacationDecision decision,
        @Size(max = 500) String adminComment
) {
}
