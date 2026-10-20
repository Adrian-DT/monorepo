package com.yko.calendar.auth;

import com.yko.calendar.mail.MailService;
import com.yko.calendar.users.User;
import com.yko.calendar.users.UserRepository;
import com.yko.calendar.users.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordResetTokenRepository tokenRepository;
    private MailService mailService;
    private PasswordEncoder passwordEncoder;
    private AuthService service;
    private User user;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        tokenRepository = mock(PasswordResetTokenRepository.class);
        mailService = mock(MailService.class);
        passwordEncoder = new BCryptPasswordEncoder();

        service = new AuthService(
                userRepository,
                tokenRepository,
                passwordEncoder,
                new JwtService("test-secret-test-secret-test-secret-123", 60),
                mailService,
                30,
                4320,
                "http://localhost:4200"
        );

        user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("adrian");
        user.setDisplayName("Adrian");
        user.setEmail("adrian@example.com");
        user.setPasswordHash(passwordEncoder.encode("secret123"));
        user.setRole(UserRole.USER);
        user.setActive(true);
    }

    @Test
    void loginWithValidCredentialsReturnsToken() {
        when(userRepository.findByUsernameIgnoreCase("adrian"))
                .thenReturn(Optional.of(user));

        LoginResponse response = service.login(" adrian ", "secret123");

        assertNotNull(response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("adrian", response.user().username());
    }

    @Test
    void loginWithWrongPasswordFails() {
        when(userRepository.findByUsernameIgnoreCase("adrian"))
                .thenReturn(Optional.of(user));

        assertThrows(
                InvalidCredentialsException.class,
                () -> service.login("adrian", "wrong")
        );
    }

    @Test
    void loginWithUnknownUserFails() {
        when(userRepository.findByUsernameIgnoreCase(anyString()))
                .thenReturn(Optional.empty());

        assertThrows(
                InvalidCredentialsException.class,
                () -> service.login("nobody", "secret123")
        );
    }

    @Test
    void loginWithInactiveUserFails() {
        user.setActive(false);
        when(userRepository.findByUsernameIgnoreCase("adrian"))
                .thenReturn(Optional.of(user));

        assertThrows(
                InvalidCredentialsException.class,
                () -> service.login("adrian", "secret123")
        );
    }

    @Test
    void forgotPasswordForUnknownUserSendsNothing() {
        when(userRepository.findByUsernameIgnoreCase(anyString()))
                .thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(anyString()))
                .thenReturn(Optional.empty());

        service.requestPasswordReset("nobody");

        verify(mailService, never()).send(anyString(), anyString(), anyString());
        verify(tokenRepository, never()).save(any());
    }

    @Test
    void forgotPasswordStoresHashedTokenAndSendsEmail() {
        when(userRepository.findByUsernameIgnoreCase("adrian"))
                .thenReturn(Optional.of(user));

        service.requestPasswordReset("adrian");

        ArgumentCaptor<PasswordResetToken> saved =
                ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(saved.capture());

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailService).send(
                eq("adrian@example.com"),
                anyString(),
                body.capture()
        );

        String rawToken = body.getValue()
                .split("reset-password\\?token=")[1]
                .split("\\s")[0];

        assertEquals(AuthService.hash(rawToken), saved.getValue().getTokenHash());
        assertTrue(saved.getValue().isUsable(OffsetDateTime.now()));
    }

    @Test
    void resetPasswordWithValidTokenChangesPasswordAndConsumesToken() {
        PasswordResetToken token = validToken("raw-token");
        when(tokenRepository.findByTokenHash(AuthService.hash("raw-token")))
                .thenReturn(Optional.of(token));
        when(userRepository.findById(user.getId()))
                .thenReturn(Optional.of(user));

        service.resetPassword("raw-token", "newSecret123");

        assertTrue(passwordEncoder.matches("newSecret123", user.getPasswordHash()));
        assertNotNull(token.getUsedAt());
    }

    @Test
    void resetPasswordWithUsedTokenFails() {
        PasswordResetToken token = validToken("raw-token");
        token.setUsedAt(OffsetDateTime.now());
        when(tokenRepository.findByTokenHash(AuthService.hash("raw-token")))
                .thenReturn(Optional.of(token));

        assertThrows(
                InvalidResetTokenException.class,
                () -> service.resetPassword("raw-token", "newSecret123")
        );
    }

    @Test
    void resetPasswordWithExpiredTokenFails() {
        PasswordResetToken token = validToken("raw-token");
        token.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
        when(tokenRepository.findByTokenHash(AuthService.hash("raw-token")))
                .thenReturn(Optional.of(token));

        assertThrows(
                InvalidResetTokenException.class,
                () -> service.resetPassword("raw-token", "newSecret123")
        );
    }

    @Test
    void resetPasswordWithUnknownTokenFails() {
        when(tokenRepository.findByTokenHash(anyString()))
                .thenReturn(Optional.empty());

        assertThrows(
                InvalidResetTokenException.class,
                () -> service.resetPassword("nope", "newSecret123")
        );
    }

    private PasswordResetToken validToken(String raw) {
        PasswordResetToken token = new PasswordResetToken();
        token.setId(UUID.randomUUID());
        token.setUserId(user.getId());
        token.setTokenHash(AuthService.hash(raw));
        token.setCreatedAt(OffsetDateTime.now());
        token.setExpiresAt(OffsetDateTime.now().plusMinutes(30));
        return token;
    }
}
