package com.yko.calendar.vacations;

import com.yko.calendar.holidays.Holiday;
import com.yko.calendar.holidays.HolidayRepository;
import com.yko.calendar.users.User;
import com.yko.calendar.users.UserRepository;
import com.yko.calendar.users.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VacationServiceTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 19);
    private static final LocalDate FRIDAY = LocalDate.of(2026, 10, 23);

    private VacationRequestRepository vacations;
    private HolidayRepository holidays;
    private UserRepository users;
    private VacationService service;

    private User maria;
    private User carlos;
    private User admin;

    @BeforeEach
    void setUp() {
        vacations = mock(VacationRequestRepository.class);
        holidays = mock(HolidayRepository.class);
        users = mock(UserRepository.class);
        service = new VacationService(vacations, holidays, users);

        maria = user("maria", "María", UserRole.USER);
        carlos = user("carlos", "Carlos", UserRole.USER);
        admin = user("admin", "Admin", UserRole.ADMIN);

        when(vacations.saveAndFlush(any(VacationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(holidays.findByDateBetween(any(), any())).thenReturn(List.of());
        when(vacations.existsOverlap(any(), any(), any(), anyCollection()))
                .thenReturn(false);
        when(users.findAllById(any())).thenReturn(List.of(maria, carlos, admin));
    }

    private User user(String username, String name, UserRole role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setDisplayName(name);
        user.setRole(role);
        user.setActive(true);
        return user;
    }

    private VacationCreateRequest request(LocalDate start, LocalDate end) {
        return new VacationCreateRequest(start, end, " Descanso ");
    }

    private VacationRequest stored(User owner, VacationStatus status) {
        VacationRequest vacation = new VacationRequest();
        vacation.setId(UUID.randomUUID());
        vacation.setUserId(owner.getId());
        vacation.setStartDate(MONDAY);
        vacation.setEndDate(FRIDAY);
        vacation.setWorkingDays(5);
        vacation.setStatus(status);
        vacation.setReason("Motivo privado");
        vacation.setAdminComment("Comentario privado");
        vacation.setCreatedAt(OffsetDateTime.now());
        vacation.setUpdatedAt(OffsetDateTime.now());
        return vacation;
    }

    private Holiday holiday(LocalDate date) {
        Holiday holiday = new Holiday();
        holiday.setId(UUID.randomUUID());
        holiday.setDate(date);
        holiday.setName("Festivo");
        return holiday;
    }

    private VacationRuleException rule(Runnable action) {
        return assertThrows(VacationRuleException.class, action::run);
    }

    @Test
    void createStoresPendingRequestWithCalculatedDaysForTheCaller() {
        VacationResponse response = service.create(maria, request(MONDAY, FRIDAY));

        assertEquals(VacationStatus.PENDING, response.status());
        assertEquals(5, response.workingDays());
        assertEquals(maria.getId(), response.userId());
        assertEquals("María", response.userName());
        assertEquals("Descanso", response.reason());
    }

    @Test
    void createDiscountsHolidaysFromTheCalendar() {
        when(holidays.findByDateBetween(MONDAY, FRIDAY))
                .thenReturn(List.of(holiday(LocalDate.of(2026, 10, 21))));

        assertEquals(4, service.create(maria, request(MONDAY, FRIDAY)).workingDays());
    }

    @Test
    void createWithoutWorkingDaysFails() {
        VacationRuleException exception = rule(() -> service.create(
                maria,
                request(LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 25))
        ));

        assertEquals("NO_WORKING_DAYS", exception.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(vacations, never()).saveAndFlush(any());
    }

    @Test
    void createAllowsPastDates() {
        VacationResponse response = service.create(
                maria,
                request(LocalDate.of(2020, 1, 6), LocalDate.of(2020, 1, 7))
        );

        assertEquals(2, response.workingDays());
    }

    @Test
    void createOverlappingOwnRequestFails() {
        when(vacations.existsOverlap(any(), any(), any(), anyCollection()))
                .thenReturn(true);

        VacationRuleException exception = rule(
                () -> service.create(maria, request(MONDAY, FRIDAY))
        );

        assertEquals("OVERLAP", exception.getCode());
        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(vacations, never()).saveAndFlush(any());
    }

    @Test
    void overlapCheckOnlyConsidersPendingAndApprovedOfTheSameUser() {
        service.create(maria, request(MONDAY, FRIDAY));

        verify(vacations).existsOverlap(
                maria.getId(),
                MONDAY,
                FRIDAY,
                java.util.EnumSet.of(VacationStatus.PENDING, VacationStatus.APPROVED)
        );
    }

    @Test
    void databaseExclusionConstraintIsTranslatedToOverlap() {
        when(vacations.saveAndFlush(any(VacationRequest.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "violates exclusion constraint",
                        new RuntimeException("ex_vacation_requests_no_overlap")
                ));

        assertEquals(
                "OVERLAP",
                rule(() -> service.create(maria, request(MONDAY, FRIDAY))).getCode()
        );
    }

    @Test
    void otherIntegrityViolationsAreNotHidden() {
        when(vacations.saveAndFlush(any(VacationRequest.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "other",
                        new RuntimeException("something else")
                ));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> service.create(maria, request(MONDAY, FRIDAY))
        );
    }

    @Test
    void ownerCancelsPendingRequest() {
        VacationRequest vacation = stored(maria, VacationStatus.PENDING);
        when(vacations.findById(vacation.getId())).thenReturn(Optional.of(vacation));

        assertEquals(
                VacationStatus.CANCELLED,
                service.cancel(maria, vacation.getId()).status()
        );
    }

    @Test
    void cancellingSomeoneElsesRequestLooksLikeNotFound() {
        VacationRequest vacation = stored(maria, VacationStatus.PENDING);
        when(vacations.findById(vacation.getId())).thenReturn(Optional.of(vacation));

        VacationRuleException exception = rule(
                () -> service.cancel(carlos, vacation.getId())
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        assertEquals(VacationStatus.PENDING, vacation.getStatus());
    }

    @Test
    void cancellingANonPendingRequestFails() {
        VacationRequest vacation = stored(maria, VacationStatus.APPROVED);
        when(vacations.findById(vacation.getId())).thenReturn(Optional.of(vacation));

        assertEquals(
                "INVALID_STATUS",
                rule(() -> service.cancel(maria, vacation.getId())).getCode()
        );
    }

    @Test
    void approvingRecalculatesWorkingDaysWithCurrentHolidays() {
        VacationRequest vacation = stored(maria, VacationStatus.PENDING);
        when(vacations.findById(vacation.getId())).thenReturn(Optional.of(vacation));
        when(holidays.findByDateBetween(MONDAY, FRIDAY))
                .thenReturn(List.of(holiday(LocalDate.of(2026, 10, 22))));

        VacationResponse response = service.decide(
                admin,
                vacation.getId(),
                new VacationDecisionRequest(VacationDecision.APPROVED, "  Ok  ")
        );

        assertEquals(VacationStatus.APPROVED, response.status());
        assertEquals(4, response.workingDays());
        assertEquals("Ok", response.adminComment());
        assertEquals(admin.getId(), vacation.getReviewedBy());
        assertNotNull(vacation.getReviewedAt());
    }

    @Test
    void approvingWithNoWorkingDaysLeftIsBlocked() {
        VacationRequest vacation = stored(maria, VacationStatus.PENDING);
        vacation.setEndDate(MONDAY);
        when(vacations.findById(vacation.getId())).thenReturn(Optional.of(vacation));
        when(holidays.findByDateBetween(MONDAY, MONDAY))
                .thenReturn(List.of(holiday(MONDAY)));

        VacationRuleException exception = rule(() -> service.decide(
                admin,
                vacation.getId(),
                new VacationDecisionRequest(VacationDecision.APPROVED, null)
        ));

        assertEquals("NO_WORKING_DAYS", exception.getCode());
        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertEquals(VacationStatus.PENDING, vacation.getStatus());
    }

    @Test
    void rejectingDoesNotRecalculateAndStoresTheComment() {
        VacationRequest vacation = stored(maria, VacationStatus.PENDING);
        when(vacations.findById(vacation.getId())).thenReturn(Optional.of(vacation));

        VacationResponse response = service.decide(
                admin,
                vacation.getId(),
                new VacationDecisionRequest(VacationDecision.REJECTED, "Sin cobertura")
        );

        assertEquals(VacationStatus.REJECTED, response.status());
        assertEquals(5, response.workingDays());
        assertEquals("Sin cobertura", response.adminComment());
        verify(holidays, never()).findByDateBetween(any(), any());
    }

    @Test
    void blankCommentIsStoredAsNull() {
        VacationRequest vacation = stored(maria, VacationStatus.PENDING);
        when(vacations.findById(vacation.getId())).thenReturn(Optional.of(vacation));

        service.decide(
                admin,
                vacation.getId(),
                new VacationDecisionRequest(VacationDecision.REJECTED, "   ")
        );

        assertNull(vacation.getAdminComment());
    }

    @Test
    void decidingTwiceFails() {
        VacationRequest vacation = stored(maria, VacationStatus.REJECTED);
        when(vacations.findById(vacation.getId())).thenReturn(Optional.of(vacation));

        assertEquals(
                "INVALID_STATUS",
                rule(() -> service.decide(
                        admin,
                        vacation.getId(),
                        new VacationDecisionRequest(VacationDecision.APPROVED, null)
                )).getCode()
        );
    }

    @Test
    void decidingUnknownRequestFails() {
        UUID id = UUID.randomUUID();
        when(vacations.findById(id)).thenReturn(Optional.empty());

        assertEquals(
                HttpStatus.NOT_FOUND,
                rule(() -> service.decide(
                        admin,
                        id,
                        new VacationDecisionRequest(VacationDecision.APPROVED, null)
                )).getStatus()
        );
    }

    @Test
    void adminSeesEveryRequestWithPrivateFields() {
        when(vacations.findAllByOrderByStartDateDescCreatedAtDesc())
                .thenReturn(List.of(
                        stored(maria, VacationStatus.PENDING),
                        stored(carlos, VacationStatus.REJECTED)
                ));

        List<VacationResponse> visible = service.listVisible(admin);

        assertEquals(2, visible.size());
        assertEquals("Motivo privado", visible.get(0).reason());
        assertEquals("Comentario privado", visible.get(1).adminComment());
    }

    @Test
    void userSeesOwnRequestsCompleteAndOthersApprovedWithoutPrivateFields() {
        when(vacations.findByUserIdOrStatusOrderByStartDateDescCreatedAtDesc(
                maria.getId(),
                VacationStatus.APPROVED
        )).thenReturn(List.of(
                stored(maria, VacationStatus.PENDING),
                stored(carlos, VacationStatus.APPROVED)
        ));

        List<VacationResponse> visible = service.listVisible(maria);

        VacationResponse own = visible.get(0);
        VacationResponse other = visible.get(1);

        assertEquals("Motivo privado", own.reason());
        assertEquals("Comentario privado", own.adminComment());

        assertEquals("Carlos", other.userName());
        assertEquals(MONDAY, other.startDate());
        assertNull(other.reason());
        assertNull(other.adminComment());
    }
}
