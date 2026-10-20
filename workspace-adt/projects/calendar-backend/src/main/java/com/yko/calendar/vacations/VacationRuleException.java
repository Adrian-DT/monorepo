package com.yko.calendar.vacations;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class VacationRuleException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    private VacationRuleException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public static VacationRuleException notFound(UUID id) {
        return new VacationRuleException(
                HttpStatus.NOT_FOUND,
                "VACATION_NOT_FOUND",
                "Vacation request " + id + " not found"
        );
    }

    public static VacationRuleException overlap() {
        return new VacationRuleException(
                HttpStatus.CONFLICT,
                "OVERLAP",
                "The user already has a pending or approved request on those dates"
        );
    }

    public static VacationRuleException invalidStatus() {
        return new VacationRuleException(
                HttpStatus.CONFLICT,
                "INVALID_STATUS",
                "Only pending requests can be changed"
        );
    }

    public static VacationRuleException noWorkingDays() {
        return new VacationRuleException(
                HttpStatus.BAD_REQUEST,
                "NO_WORKING_DAYS",
                "The period does not include any working day"
        );
    }

    public static VacationRuleException noWorkingDaysOnApproval() {
        return new VacationRuleException(
                HttpStatus.CONFLICT,
                "NO_WORKING_DAYS",
                "The period no longer includes any working day; reject the request instead"
        );
    }

    public static VacationRuleException rangeOutsidePeriod() {
        return new VacationRuleException(
                HttpStatus.BAD_REQUEST,
                "RANGE_OUTSIDE_PERIOD",
                "The range must be inside the approved vacation period"
        );
    }

    public static VacationRuleException pastDates() {
        return new VacationRuleException(
                HttpStatus.BAD_REQUEST,
                "PAST_DATES",
                "Days that have already passed cannot be cancelled by the user"
        );
    }

    public static VacationRuleException cancellationRequestPending() {
        return new VacationRuleException(
                HttpStatus.CONFLICT,
                "CANCELLATION_REQUEST_PENDING",
                "Resolve the pending cancellation request first"
        );
    }

    public static VacationRuleException cancellationAlreadyRequested() {
        return new VacationRuleException(
                HttpStatus.CONFLICT,
                "CANCELLATION_ALREADY_REQUESTED",
                "There is already a pending cancellation request for this vacation"
        );
    }

    public static VacationRuleException cancellationNotFound(UUID id) {
        return new VacationRuleException(
                HttpStatus.NOT_FOUND,
                "CANCELLATION_NOT_FOUND",
                "Cancellation request " + id + " not found"
        );
    }
}
