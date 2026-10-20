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
}
