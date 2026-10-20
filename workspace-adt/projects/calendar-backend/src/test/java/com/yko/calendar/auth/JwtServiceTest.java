package com.yko.calendar.auth;

import com.yko.calendar.users.User;
import com.yko.calendar.users.UserRole;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-123";

    private User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("adrian");
        user.setRole(UserRole.USER);
        return user;
    }

    @Test
    void generatedTokenIsParsedBackToUserId() {
        JwtService service = new JwtService(SECRET, 60);
        User user = user();

        String token = service.generateToken(user);

        assertEquals(user.getId(), service.parseUserId(token).orElseThrow());
    }

    @Test
    void tamperedTokenIsRejected() {
        JwtService service = new JwtService(SECRET, 60);

        String token = service.generateToken(user());

        assertTrue(service.parseUserId(token + "x").isEmpty());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() {
        JwtService other = new JwtService("another-secret-another-secret-12345678", 60);
        JwtService service = new JwtService(SECRET, 60);

        assertTrue(service.parseUserId(other.generateToken(user())).isEmpty());
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService service = new JwtService(SECRET, -1);

        assertTrue(service.parseUserId(service.generateToken(user())).isEmpty());
    }

    @Test
    void shortSecretIsRejected() {
        assertThrows(IllegalStateException.class, () -> new JwtService("short", 60));
    }
}
