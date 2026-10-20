package com.yko.calendar.users;

import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String username,
        String displayName
) {

    public static UserSummaryResponse from(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName()
        );
    }
}
