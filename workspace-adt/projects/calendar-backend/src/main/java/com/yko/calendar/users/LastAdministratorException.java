package com.yko.calendar.users;

public class LastAdministratorException extends RuntimeException {

    public LastAdministratorException() {
        super("The last active administrator cannot be deactivated or demoted");
    }
}
