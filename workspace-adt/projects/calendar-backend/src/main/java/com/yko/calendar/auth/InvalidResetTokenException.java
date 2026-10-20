package com.yko.calendar.auth;

public class InvalidResetTokenException extends RuntimeException {

    public InvalidResetTokenException() {
        super("The reset token is invalid or has expired");
    }
}
