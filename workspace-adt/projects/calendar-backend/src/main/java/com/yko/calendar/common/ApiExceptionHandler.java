package com.yko.calendar.common;

import com.yko.calendar.auth.InvalidCredentialsException;
import com.yko.calendar.auth.InvalidCurrentPasswordException;
import com.yko.calendar.auth.InvalidResetTokenException;
import com.yko.calendar.holidays.DuplicateHolidayDateException;
import com.yko.calendar.holidays.HolidayNotFoundException;
import com.yko.calendar.users.DuplicateFieldException;
import com.yko.calendar.users.LastAdministratorException;
import com.yko.calendar.users.UserNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    public ProblemDetail invalidCredentials(InvalidCredentialsException exception) {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED,
                exception.getMessage()
        );
    }

    @ExceptionHandler(InvalidResetTokenException.class)
    public ProblemDetail invalidResetToken(InvalidResetTokenException exception) {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
    }

    @ExceptionHandler(InvalidCurrentPasswordException.class)
    public ProblemDetail invalidCurrentPassword(
            InvalidCurrentPasswordException exception
    ) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
        problem.setProperty("code", "INVALID_CURRENT_PASSWORD");

        return problem;
    }

    @ExceptionHandler(DuplicateFieldException.class)
    public ProblemDetail duplicateField(DuplicateFieldException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                exception.getMessage()
        );
        problem.setProperty("code", "DUPLICATE_FIELD");
        problem.setProperty("field", exception.getField());

        return problem;
    }

    @ExceptionHandler(LastAdministratorException.class)
    public ProblemDetail lastAdministrator(LastAdministratorException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                exception.getMessage()
        );
        problem.setProperty("code", "LAST_ADMINISTRATOR");

        return problem;
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ProblemDetail userNotFound(UserNotFoundException exception) {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                exception.getMessage()
        );
    }

    @ExceptionHandler(HolidayNotFoundException.class)
    public ProblemDetail holidayNotFound(HolidayNotFoundException exception) {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                exception.getMessage()
        );
    }

    @ExceptionHandler(DuplicateHolidayDateException.class)
    public ProblemDetail duplicateHolidayDate(
            DuplicateHolidayDateException exception
    ) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                exception.getMessage()
        );
        problem.setProperty("code", "DUPLICATE_DATE");

        return problem;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail unreadable(HttpMessageNotReadableException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Malformed request body"
        );
        problem.setProperty("code", "MALFORMED_BODY");

        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();

        exception.getBindingResult().getFieldErrors().forEach(error ->
                fields.putIfAbsent(error.getField(), error.getDefaultMessage())
        );

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Validation failed"
        );
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("fields", fields);

        return problem;
    }
}
