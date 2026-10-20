package com.yko.calendar.vacations;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CancellationResponse(
        UUID id,
        UUID vacationId,
        UUID userId,
        String userName,
        LocalDate fromDate,
        LocalDate toDate,
        CancellationStatus status,
        UUID requestedBy,
        String requestReason,
        String resolutionComment,
        Integer releasedWorkingDays,
        LocalDate originalStartDate,
        LocalDate originalEndDate,
        int originalWorkingDays,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt
) {

    public static CancellationResponse from(
            VacationCancellation cancellation,
            String userName
    ) {
        return new CancellationResponse(
                cancellation.getId(),
                cancellation.getVacationId(),
                cancellation.getUserId(),
                userName,
                cancellation.getFromDate(),
                cancellation.getToDate(),
                cancellation.getStatus(),
                cancellation.getRequestedBy(),
                cancellation.getRequestReason(),
                cancellation.getResolutionComment(),
                cancellation.getReleasedWorkingDays(),
                cancellation.getOriginalStartDate(),
                cancellation.getOriginalEndDate(),
                cancellation.getOriginalWorkingDays(),
                cancellation.getCreatedAt(),
                cancellation.getResolvedAt()
        );
    }
}
