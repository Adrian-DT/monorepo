package com.yko.calendar.users;

public class DuplicateFieldException extends RuntimeException {

    private final String field;

    public DuplicateFieldException(String field) {
        super("A user with that " + field + " already exists");
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
