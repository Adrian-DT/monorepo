package com.yko.calendar.users;

import com.yko.calendar.auth.AuthService;
import com.yko.calendar.auth.UserResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthService authService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listAll() {
        return userRepository.findAllByOrderByDisplayNameAsc()
                .stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> listActive() {
        return userRepository.findByActiveTrueOrderByDisplayNameAsc()
                .stream()
                .map(UserSummaryResponse::from)
                .toList();
    }

    @Transactional
    public CreateUserResponse create(UserRequest request) {
        String username = normalizeUsername(request.username());
        String email = normalizeEmail(request.email());

        assertUsernameAvailable(username, null);
        assertEmailAvailable(email, null);

        OffsetDateTime now = OffsetDateTime.now();

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setDisplayName(request.displayName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole(request.role());
        user.setActive(true);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        userRepository.saveAndFlush(user);

        boolean sent = authService.sendInvitation(user);

        return new CreateUserResponse(UserResponse.from(user), sent);
    }

    @Transactional
    public UserResponse update(UUID id, UserRequest request) {
        User user = find(id);

        String username = normalizeUsername(request.username());
        String email = normalizeEmail(request.email());

        assertUsernameAvailable(username, id);
        assertEmailAvailable(email, id);

        if (user.getRole() == UserRole.ADMIN
                && request.role() != UserRole.ADMIN) {
            assertNotLastAdministrator(user);
        }

        user.setUsername(username);
        user.setDisplayName(request.displayName().trim());
        user.setEmail(email);
        user.setRole(request.role());
        user.setUpdatedAt(OffsetDateTime.now());

        return UserResponse.from(userRepository.saveAndFlush(user));
    }

    @Transactional
    public UserResponse setActive(UUID id, boolean active) {
        User user = find(id);

        if (!active) {
            assertNotLastAdministrator(user);
        }

        user.setActive(active);
        user.setUpdatedAt(OffsetDateTime.now());

        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public InvitationResult invite(UUID id) {
        User user = find(id);

        return new InvitationResult(
                user.isActive() && authService.sendInvitation(user)
        );
    }

    private User find(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));
    }

    private void assertNotLastAdministrator(User user) {
        if (user.getRole() == UserRole.ADMIN
                && user.isActive()
                && userRepository.countByRoleAndActiveTrue(UserRole.ADMIN) <= 1) {
            throw new LastAdministratorException();
        }
    }

    private void assertUsernameAvailable(String username, UUID excludeId) {
        boolean taken = userRepository.findByUsernameIgnoreCase(username)
                .filter(found -> !found.getId().equals(excludeId))
                .isPresent();

        if (taken) {
            throw new DuplicateFieldException("username");
        }
    }

    private void assertEmailAvailable(String email, UUID excludeId) {
        boolean taken = userRepository.findByEmailIgnoreCase(email)
                .filter(found -> !found.getId().equals(excludeId))
                .isPresent();

        if (taken) {
            throw new DuplicateFieldException("email");
        }
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
