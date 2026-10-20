package com.yko.calendar.vacations;

import java.util.List;

public record CancellationResult(
        CancellationResponse cancellation,
        List<VacationResponse> vacations
) {
}
