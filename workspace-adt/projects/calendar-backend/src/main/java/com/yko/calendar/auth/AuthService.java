package com.yko.calendar.auth;

import com.yko.calendar.mail.MailService;
import com.yko.calendar.users.User;
import com.yko.calendar.users.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;
    private final Duration resetTokenExpiration;
    private final Duration invitationTokenExpiration;
    private final String frontendBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String dummyHash;

    public AuthService(
            UserRepository userRepository,
            PasswordResetTokenRepository resetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            MailService mailService,
            @Value("${app.security.reset-token-expiration-minutes}") long resetTokenMinutes,
            @Value("${app.security.invitation-token-expiration-minutes}") long invitationTokenMinutes,
            @Value("${app.frontend.base-url}") String frontendBaseUrl
    ) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.resetTokenExpiration = Duration.ofMinutes(resetTokenMinutes);
        this.invitationTokenExpiration = Duration.ofMinutes(invitationTokenMinutes);
        this.frontendBaseUrl = frontendBaseUrl;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional(readOnly = true)
    public LoginResponse login(String username, String password) {
        Optional<User> found = userRepository
                .findByUsernameIgnoreCase(username.trim());

        if (found.isEmpty()) {
            passwordEncoder.matches(password, dummyHash);
            throw new InvalidCredentialsException();
        }

        User user = found.get();

        if (!user.isActive()
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return new LoginResponse(
                jwtService.generateToken(user),
                "Bearer",
                jwtService.expiresInSeconds(),
                UserResponse.from(user)
        );
    }

    @Transactional
    public void requestPasswordReset(String identifier) {
        String value = identifier.trim();

        Optional<User> found = userRepository.findByUsernameIgnoreCase(value)
                .or(() -> userRepository.findByEmailIgnoreCase(value))
                .filter(User::isActive);

        if (found.isEmpty()) {
            return;
        }

        User user = found.get();
        String link = issueTokenLink(user, resetTokenExpiration);

        mailService.send(
                user.getEmail(),
                "Recuperación de contraseña",
                "Hola " + user.getDisplayName() + ",\n\n"
                        + "Hemos recibido una solicitud para restablecer tu contraseña.\n"
                        + "Usa este enlace (válido durante "
                        + resetTokenExpiration.toMinutes() + " minutos):\n\n"
                        + link + "\n\n"
                        + "Si no lo has solicitado, ignora este mensaje."
        );
    }

    @Transactional
    public boolean sendInvitation(User user) {
        String link = issueTokenLink(user, invitationTokenExpiration);

        return mailService.send(
                user.getEmail(),
                "Invitación a YKO Calendar",
                "Hola " + user.getDisplayName() + ",\n\n"
                        + "Se ha creado una cuenta para ti. Tu usuario es: "
                        + user.getUsername() + "\n"
                        + "Define tu contraseña con este enlace (válido durante "
                        + invitationTokenExpiration.toHours() + " horas):\n\n"
                        + link
        );
    }

    @Transactional
    public void changePassword(
            User user,
            String currentPassword,
            String newPassword
    ) {
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new InvalidCurrentPasswordException();
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(user);
    }

    private String issueTokenLink(User user, Duration validity) {
        String rawToken = generateRawToken();
        OffsetDateTime now = OffsetDateTime.now();

        resetTokenRepository.deleteByUserId(user.getId());
        resetTokenRepository.flush();

        PasswordResetToken token = new PasswordResetToken();
        token.setId(UUID.randomUUID());
        token.setUserId(user.getId());
        token.setTokenHash(hash(rawToken));
        token.setCreatedAt(now);
        token.setExpiresAt(now.plus(validity));
        resetTokenRepository.save(token);

        return frontendBaseUrl + "/reset-password?token=" + rawToken;
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        OffsetDateTime now = OffsetDateTime.now();

        PasswordResetToken token = resetTokenRepository
                .findByTokenHash(hash(rawToken))
                .filter(candidate -> candidate.isUsable(now))
                .orElseThrow(InvalidResetTokenException::new);

        User user = userRepository.findById(token.getUserId())
                .filter(User::isActive)
                .orElseThrow(InvalidResetTokenException::new);

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(now);
        token.setUsedAt(now);
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);

        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            return HexFormat.of().formatHex(
                    digest.digest(value.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
