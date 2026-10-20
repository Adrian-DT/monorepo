package com.yko.calendar.users;

import com.yko.calendar.auth.UserResponse;

public record CreateUserResponse(
        UserResponse user,
        boolean invitationSent
) {
}
