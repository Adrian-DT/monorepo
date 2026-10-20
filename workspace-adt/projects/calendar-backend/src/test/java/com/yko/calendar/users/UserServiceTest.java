package com.yko.calendar.users;

import com.yko.calendar.auth.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository userRepository;
    private AuthService authService;
    private UserService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        authService = mock(AuthService.class);
        service = new UserService(
                userRepository,
                new BCryptPasswordEncoder(),
                authService
        );

        when(userRepository.saveAndFlush(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findByUsernameIgnoreCase(anyString()))
                .thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(anyString()))
                .thenReturn(Optional.empty());
    }

    private User user(UserRole role, boolean active) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("someone");
        user.setDisplayName("Someone");
        user.setEmail("someone@example.com");
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setActive(active);
        return user;
    }

    private UserRequest request(String username, String email, UserRole role) {
        return new UserRequest(username, "Display Name", email, role);
    }

    @Test
    void createNormalizesFieldsAndSendsInvitation() {
        when(authService.sendInvitation(any(User.class))).thenReturn(true);

        CreateUserResponse response = service.create(
                request(" Maria ", " Maria@Example.COM ", UserRole.USER)
        );

        assertEquals("maria", response.user().username());
        assertEquals("maria@example.com", response.user().email());
        assertTrue(response.user().active());
        assertTrue(response.invitationSent());
    }

    @Test
    void createStillSucceedsWhenInvitationFails() {
        when(authService.sendInvitation(any(User.class))).thenReturn(false);

        CreateUserResponse response = service.create(
                request("maria", "maria@example.com", UserRole.USER)
        );

        assertFalse(response.invitationSent());
    }

    @Test
    void createWithDuplicateUsernameFails() {
        when(userRepository.findByUsernameIgnoreCase("maria"))
                .thenReturn(Optional.of(user(UserRole.USER, true)));

        DuplicateFieldException exception = assertThrows(
                DuplicateFieldException.class,
                () -> service.create(
                        request("maria", "maria@example.com", UserRole.USER)
                )
        );

        assertEquals("username", exception.getField());
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void createWithDuplicateEmailFails() {
        when(userRepository.findByEmailIgnoreCase("maria@example.com"))
                .thenReturn(Optional.of(user(UserRole.USER, true)));

        DuplicateFieldException exception = assertThrows(
                DuplicateFieldException.class,
                () -> service.create(
                        request("maria", "maria@example.com", UserRole.USER)
                )
        );

        assertEquals("email", exception.getField());
    }

    @Test
    void updateKeepingOwnUsernameIsAllowed() {
        User existing = user(UserRole.USER, true);
        when(userRepository.findById(existing.getId()))
                .thenReturn(Optional.of(existing));
        when(userRepository.findByUsernameIgnoreCase("someone"))
                .thenReturn(Optional.of(existing));

        assertEquals(
                "someone",
                service.update(
                        existing.getId(),
                        request("someone", "new@example.com", UserRole.USER)
                ).username()
        );
    }

    @Test
    void demotingLastAdministratorFails() {
        User admin = user(UserRole.ADMIN, true);
        when(userRepository.findById(admin.getId()))
                .thenReturn(Optional.of(admin));
        when(userRepository.countByRoleAndActiveTrue(UserRole.ADMIN))
                .thenReturn(1L);

        assertThrows(
                LastAdministratorException.class,
                () -> service.update(
                        admin.getId(),
                        request("someone", "someone@example.com", UserRole.USER)
                )
        );
    }

    @Test
    void demotingAdministratorIsAllowedWhenAnotherExists() {
        User admin = user(UserRole.ADMIN, true);
        when(userRepository.findById(admin.getId()))
                .thenReturn(Optional.of(admin));
        when(userRepository.countByRoleAndActiveTrue(UserRole.ADMIN))
                .thenReturn(2L);

        assertEquals(
                "USER",
                service.update(
                        admin.getId(),
                        request("someone", "someone@example.com", UserRole.USER)
                ).role()
        );
    }

    @Test
    void deactivatingLastAdministratorFails() {
        User admin = user(UserRole.ADMIN, true);
        when(userRepository.findById(admin.getId()))
                .thenReturn(Optional.of(admin));
        when(userRepository.countByRoleAndActiveTrue(UserRole.ADMIN))
                .thenReturn(1L);

        assertThrows(
                LastAdministratorException.class,
                () -> service.setActive(admin.getId(), false)
        );
    }

    @Test
    void deactivatingRegularUserIsAllowed() {
        User regular = user(UserRole.USER, true);
        when(userRepository.findById(regular.getId()))
                .thenReturn(Optional.of(regular));

        assertFalse(service.setActive(regular.getId(), false).active());
    }

    @Test
    void unknownUserFails() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(
                UserNotFoundException.class,
                () -> service.setActive(id, true)
        );
    }

    @Test
    void inviteInactiveUserSendsNothing() {
        User inactive = user(UserRole.USER, false);
        when(userRepository.findById(inactive.getId()))
                .thenReturn(Optional.of(inactive));

        assertFalse(service.invite(inactive.getId()).invitationSent());
        verify(authService, never()).sendInvitation(any());
    }
}
