package com.yko.calendar.vacations;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record VacationResponse(
        UUID id,
        UUID userId,
        String userName,
        LocalDate startDate,
        LocalDate endDate,
        int workingDays,
        VacationStatus status,
        String reason,
        String adminComment,
        OffsetDateTime createdAt
) {

    public static VacationResponse from(
            VacationRequest request,
            String userName,
            boolean includePrivateFields
    ) {
        return new VacationResponse(
                request.getId(),
                request.getUserId(),
                userName,
                request.getStartDate(),
                request.getEndDate(),
                request.getWorkingDays(),
                request.getStatus(),
                includePrivateFields ? request.getReason() : null,
                includePrivateFields ? request.getAdminComment() : null,
                request.getCreatedAt()
        );
    }
}
