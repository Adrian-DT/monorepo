package com.yko.calendar.auth;

public class InvalidCurrentPasswordException extends RuntimeException {

    public InvalidCurrentPasswordException() {
        super("The current password is incorrect");
    }
}
