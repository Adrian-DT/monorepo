package com.yko.calendar.vacations;

import com.yko.calendar.holidays.Holiday;
import com.yko.calendar.holidays.HolidayRepository;
import com.yko.calendar.mail.MailService;
import com.yko.calendar.users.User;
import com.yko.calendar.users.UserRepository;
import com.yko.calendar.users.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VacationCancellationServiceTest {

    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");
    private static final LocalDate START = LocalDate.of(2026, 11, 2);
    private static final LocalDate END = LocalDate.of(2026, 11, 13);

    private VacationRequestRepository vacations;
    private VacationCancellationRepository cancellations;
    private HolidayRepository holidays;
    private UserRepository users;
    private MailService mail;
    private VacationCancellationService service;

    private User maria;
    private User carlos;
    private User admin;
    private VacationRequest vacation;

    private static Clock clockAt(LocalDate day) {
        return Clock.fixed(day.atTime(10, 0).atZone(MADRID).toInstant(), MADRID);
    }

    private VacationCancellationService serviceWith(Clock clock) {
        return new VacationCancellationService(
                vacations, cancellations, holidays, users, mail, clock
        );
    }

    @BeforeEach
    void setUp() {
        vacations = mock(VacationRequestRepository.class);
        cancellations = mock(VacationCancellationRepository.class);
        holidays = mock(HolidayRepository.class);
        users = mock(UserRepository.class);
        mail = mock(MailService.class);

        maria = user("maria", "María", UserRole.USER);
        carlos = user("carlos", "Carlos", UserRole.USER);
        admin = user("admin", "Admin", UserRole.ADMIN);

        vacation = approved(maria, START, END, 10);

        service = serviceWith(clockAt(LocalDate.of(2026, 10, 21)));

        when(vacations.findByIdForUpdate(vacation.getId()))
                .thenReturn(Optional.of(vacation));
        when(vacations.saveAndFlush(any(VacationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(cancellations.saveAndFlush(any(VacationCancellation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(cancellations.existsByVacationIdAndStatus(any(), any())).thenReturn(false);
        when(holidays.findByDateBetween(any(), any())).thenReturn(List.of());
        when(users.findById(maria.getId())).thenReturn(Optional.of(maria));
        when(users.findByRoleAndActiveTrue(UserRole.ADMIN)).thenReturn(List.of(admin));
        when(mail.send(anyString(), anyString(), anyString())).thenReturn(true);
    }

    private User user(String username, String name, UserRole role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setDisplayName(name);
        user.setEmail(username + "@example.com");
        user.setRole(role);
        user.setActive(true);
        return user;
    }

    private VacationRequest approved(User owner, LocalDate start, LocalDate end, int days) {
        VacationRequest request = new VacationRequest();
        request.setId(UUID.randomUUID());
        request.setUserId(owner.getId());
        request.setStartDate(start);
        request.setEndDate(end);
        request.setWorkingDays(days);
        request.setStatus(VacationStatus.APPROVED);
        request.setReason("Motivo");
        request.setReviewedBy(admin == null ? null : admin.getId());
        request.setReviewedAt(OffsetDateTime.now());
        request.setCreatedAt(OffsetDateTime.now());
        request.setUpdatedAt(OffsetDateTime.now());
        return request;
    }

    private Holiday holiday(LocalDate date) {
        Holiday holiday = new Holiday();
        holiday.setId(UUID.randomUUID());
        holiday.setDate(date);
        holiday.setName("Festivo");
        return holiday;
    }

    private AdminCancelRequest range(String from, String to, String comment) {
        return new AdminCancelRequest(
                from == null ? null : LocalDate.parse(from),
                to == null ? null : LocalDate.parse(to),
                comment
        );
    }

    private CancellationCreateRequest userRequest(String from, String to, String reason) {
        return new CancellationCreateRequest(
                from == null ? null : LocalDate.parse(from),
                to == null ? null : LocalDate.parse(to),
                reason
        );
    }

    private VacationCancellation pending(User owner, VacationRequest target, String from, String to) {
        VacationCancellation cancellation = new VacationCancellation();
        cancellation.setId(UUID.randomUUID());
        cancellation.setVacationId(target.getId());
        cancellation.setUserId(owner.getId());
        cancellation.setFromDate(LocalDate.parse(from));
        cancellation.setToDate(LocalDate.parse(to));
        cancellation.setStatus(CancellationStatus.PENDING);
        cancellation.setRequestedBy(owner.getId());
        cancellation.setRequestReason("Imprevisto");
        cancellation.setOriginalStartDate(target.getStartDate());
        cancellation.setOriginalEndDate(target.getEndDate());
        cancellation.setOriginalWorkingDays(target.getWorkingDays());
        cancellation.setCreatedAt(OffsetDateTime.now());
        cancellation.setUpdatedAt(OffsetDateTime.now());
        return cancellation;
    }

    private VacationRuleException rule(Runnable action) {
        return assertThrows(VacationRuleException.class, action::run);
    }

    @Test
    void directFullCancellationMarksTheVacationCancelled() {
        CancellationResult result = service.cancelDirectly(
                admin, vacation.getId(), range(null, null, "  Cambio de planes  ")
        );

        assertEquals(VacationStatus.CANCELLED, vacation.getStatus());
        assertEquals(1, result.vacations().size());
        assertEquals(VacationStatus.CANCELLED, result.vacations().get(0).status());

        CancellationResponse record = result.cancellation();
        assertEquals(CancellationStatus.APPROVED, record.status());
        assertEquals(10, record.releasedWorkingDays());
        assertEquals(START, record.fromDate());
        assertEquals(END, record.toDate());
        assertEquals("Cambio de planes", record.resolutionComment());
        assertEquals(admin.getId(), record.requestedBy());
        assertEquals(START, record.originalStartDate());
        assertEquals(10, record.originalWorkingDays());
    }

    @Test
    void directCancellationWithoutBodyCancelsEverything() {
        service.cancelDirectly(admin, vacation.getId(), null);

        assertEquals(VacationStatus.CANCELLED, vacation.getStatus());
    }

    @Test
    void partialCancellationAtTheEndShortensTheVacation() {
        CancellationResult result = service.cancelDirectly(
                admin, vacation.getId(), range("2026-11-12", "2026-11-13", null)
        );

        assertEquals(VacationStatus.APPROVED, vacation.getStatus());
        assertEquals(START, vacation.getStartDate());
        assertEquals(LocalDate.of(2026, 11, 11), vacation.getEndDate());
        assertEquals(8, vacation.getWorkingDays());
        assertEquals(2, result.cancellation().releasedWorkingDays());
        assertEquals(1, result.vacations().size());
        assertNull(result.cancellation().resolutionComment());
    }

    @Test
    void partialCancellationAtTheStartShortensTheVacation() {
        CancellationResult result = service.cancelDirectly(
                admin, vacation.getId(), range("2026-11-02", "2026-11-03", null)
        );

        assertEquals(LocalDate.of(2026, 11, 4), vacation.getStartDate());
        assertEquals(END, vacation.getEndDate());
        assertEquals(8, vacation.getWorkingDays());
        assertEquals(2, result.cancellation().releasedWorkingDays());
    }

    @Test
    void partialCancellationInTheMiddleSplitsTheVacationInTwo() {
        CancellationResult result = service.cancelDirectly(
                admin, vacation.getId(), range("2026-11-05", "2026-11-09", null)
        );

        assertEquals(2, result.vacations().size());

        assertEquals(START, vacation.getStartDate());
        assertEquals(LocalDate.of(2026, 11, 4), vacation.getEndDate());
        assertEquals(3, vacation.getWorkingDays());

        VacationResponse extra = result.vacations().get(1);
        assertEquals(LocalDate.of(2026, 11, 10), extra.startDate());
        assertEquals(END, extra.endDate());
        assertEquals(4, extra.workingDays());
        assertEquals(VacationStatus.APPROVED, extra.status());
        assertEquals(maria.getId(), extra.userId());
        assertEquals("Motivo", extra.reason());

        assertEquals(3, result.cancellation().releasedWorkingDays());
    }

    @Test
    void splitCreatesAChildLinkedToTheOriginalVacation() {
        service.cancelDirectly(admin, vacation.getId(), range("2026-11-05", "2026-11-09", null));

        org.mockito.ArgumentCaptor<VacationRequest> saved =
                org.mockito.ArgumentCaptor.forClass(VacationRequest.class);
        verify(vacations, org.mockito.Mockito.times(2)).saveAndFlush(saved.capture());

        VacationRequest child = saved.getAllValues().get(1);
        assertNotNull(child.getParentVacationId());
        assertEquals(vacation.getId(), child.getParentVacationId());
    }

    @Test
    void remainingSegmentsAreRecalculatedWithCurrentHolidays() {
        when(holidays.findByDateBetween(any(), any()))
                .thenReturn(List.of(holiday(LocalDate.of(2026, 11, 4))));

        CancellationResult result = service.cancelDirectly(
                admin, vacation.getId(), range("2026-11-12", "2026-11-13", null)
        );

        assertEquals(7, vacation.getWorkingDays());
        assertEquals(3, result.cancellation().releasedWorkingDays());
    }

    @Test
    void aRemainingSegmentWithoutWorkingDaysIsDiscarded() {
        vacation.setEndDate(LocalDate.of(2026, 11, 8));
        vacation.setWorkingDays(5);

        CancellationResult result = service.cancelDirectly(
                admin, vacation.getId(), range("2026-11-02", "2026-11-06", null)
        );

        assertEquals(VacationStatus.CANCELLED, vacation.getStatus());
        assertEquals(1, result.vacations().size());
        assertEquals(5, result.cancellation().releasedWorkingDays());
    }

    @Test
    void rangeOutsideThePeriodFails() {
        VacationRuleException exception = rule(() -> service.cancelDirectly(
                admin, vacation.getId(), range("2026-11-01", "2026-11-03", null)
        ));

        assertEquals("RANGE_OUTSIDE_PERIOD", exception.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(VacationStatus.APPROVED, vacation.getStatus());
    }

    @Test
    void rangeWithoutWorkingDaysFails() {
        assertEquals(
                "NO_WORKING_DAYS",
                rule(() -> service.cancelDirectly(
                        admin, vacation.getId(), range("2026-11-07", "2026-11-08", null)
                )).getCode()
        );
    }

    @Test
    void onlyApprovedVacationsCanBeCancelled() {
        for (VacationStatus status : List.of(
                VacationStatus.PENDING,
                VacationStatus.REJECTED,
                VacationStatus.CANCELLED
        )) {
            vacation.setStatus(status);

            assertEquals(
                    "INVALID_STATUS",
                    rule(() -> service.cancelDirectly(admin, vacation.getId(), null)).getCode()
            );
        }
    }

    @Test
    void directCancellationIsBlockedWhileARequestIsPending() {
        when(cancellations.existsByVacationIdAndStatus(
                vacation.getId(), CancellationStatus.PENDING
        )).thenReturn(true);

        VacationRuleException exception = rule(
                () -> service.cancelDirectly(admin, vacation.getId(), null)
        );

        assertEquals("CANCELLATION_REQUEST_PENDING", exception.getCode());
        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertEquals(VacationStatus.APPROVED, vacation.getStatus());
    }

    @Test
    void directCancellationOfUnknownVacationFails() {
        UUID id = UUID.randomUUID();
        when(vacations.findByIdForUpdate(id)).thenReturn(Optional.empty());

        assertEquals(
                HttpStatus.NOT_FOUND,
                rule(() -> service.cancelDirectly(admin, id, null)).getStatus()
        );
    }

    @Test
    void directCancellationNotifiesTheOwnerAndSurvivesMailFailure() {
        service.cancelDirectly(admin, vacation.getId(), range(null, null, "Imprevisto"));

        verify(mail).send(
                eq("maria@example.com"),
                eq("Cancelación de vacaciones"),
                contains("Imprevisto")
        );

        VacationRequest other = approved(maria, START, END, 10);
        when(vacations.findByIdForUpdate(other.getId())).thenReturn(Optional.of(other));
        when(mail.send(anyString(), anyString(), anyString())).thenReturn(false);

        service.cancelDirectly(admin, other.getId(), null);

        assertEquals(VacationStatus.CANCELLED, other.getStatus());
    }

    @Test
    void userRequestIsStoredAsPendingAndAdminsAreNotified() {
        CancellationResult result = service.requestCancellation(
                maria, vacation.getId(), userRequest("2026-11-09", "2026-11-13", "  Imprevisto  ")
        );

        CancellationResponse record = result.cancellation();
        assertEquals(CancellationStatus.PENDING, record.status());
        assertEquals("Imprevisto", record.requestReason());
        assertEquals(maria.getId(), record.requestedBy());
        assertNull(record.releasedWorkingDays());
        assertEquals(VacationStatus.APPROVED, vacation.getStatus());
        assertEquals(END, vacation.getEndDate());

        verify(mail).send(
                eq("admin@example.com"),
                eq("Solicitud de cancelación de vacaciones"),
                contains("Imprevisto")
        );
    }

    @Test
    void userRequestWithoutDatesCoversTheWholeFuturePeriod() {
        assertEquals(
                START,
                service.requestCancellation(
                        maria, vacation.getId(), userRequest(null, null, "Imprevisto")
                ).cancellation().fromDate()
        );
    }

    @Test
    void userRequestWithoutDatesOnAStartedVacationStartsToday() {
        VacationCancellationService started = serviceWith(clockAt(LocalDate.of(2026, 11, 5)));

        CancellationResponse record = started.requestCancellation(
                maria, vacation.getId(), userRequest(null, null, "Imprevisto")
        ).cancellation();

        assertEquals(LocalDate.of(2026, 11, 5), record.fromDate());
        assertEquals(END, record.toDate());
    }

    @Test
    void userCannotRequestDaysThatHavePassed() {
        VacationCancellationService started = serviceWith(clockAt(LocalDate.of(2026, 11, 5)));

        assertEquals(
                "PAST_DATES",
                rule(() -> started.requestCancellation(
                        maria, vacation.getId(), userRequest("2026-11-03", "2026-11-13", "x")
                )).getCode()
        );
    }

    @Test
    void userCannotRequestAnAlreadyFinishedVacation() {
        VacationCancellationService finished = serviceWith(clockAt(LocalDate.of(2026, 12, 1)));

        assertEquals(
                "PAST_DATES",
                rule(() -> finished.requestCancellation(
                        maria, vacation.getId(), userRequest(null, null, "x")
                )).getCode()
        );
    }

    @Test
    void userRequestOutsideThePeriodFails() {
        assertEquals(
                "RANGE_OUTSIDE_PERIOD",
                rule(() -> service.requestCancellation(
                        maria, vacation.getId(), userRequest("2026-11-10", "2026-11-20", "x")
                )).getCode()
        );
    }

    @Test
    void userRequestWithoutWorkingDaysFails() {
        assertEquals(
                "NO_WORKING_DAYS",
                rule(() -> service.requestCancellation(
                        maria, vacation.getId(), userRequest("2026-11-07", "2026-11-08", "x")
                )).getCode()
        );
    }

    @Test
    void requestingSomeoneElsesVacationLooksLikeNotFound() {
        assertEquals(
                HttpStatus.NOT_FOUND,
                rule(() -> service.requestCancellation(
                        carlos, vacation.getId(), userRequest(null, null, "x")
                )).getStatus()
        );
    }

    @Test
    void userCanOnlyRequestCancellationOfApprovedVacations() {
        vacation.setStatus(VacationStatus.PENDING);

        assertEquals(
                "INVALID_STATUS",
                rule(() -> service.requestCancellation(
                        maria, vacation.getId(), userRequest(null, null, "x")
                )).getCode()
        );
    }

    @Test
    void secondPendingRequestIsRejected() {
        when(cancellations.existsByVacationIdAndStatus(
                vacation.getId(), CancellationStatus.PENDING
        )).thenReturn(true);

        VacationRuleException exception = rule(() -> service.requestCancellation(
                maria, vacation.getId(), userRequest(null, null, "x")
        ));

        assertEquals("CANCELLATION_ALREADY_REQUESTED", exception.getCode());
        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
    }

    @Test
    void databaseUniqueIndexIsTranslatedToAlreadyRequested() {
        when(cancellations.saveAndFlush(any(VacationCancellation.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "duplicate",
                        new RuntimeException("uk_vacation_cancellations_pending")
                ));

        assertEquals(
                "CANCELLATION_ALREADY_REQUESTED",
                rule(() -> service.requestCancellation(
                        maria, vacation.getId(), userRequest(null, null, "x")
                )).getCode()
        );
    }

    @Test
    void ownerWithdrawsAPendingRequest() {
        VacationCancellation cancellation = pending(maria, vacation, "2026-11-09", "2026-11-13");
        when(cancellations.findByIdForUpdate(cancellation.getId()))
                .thenReturn(Optional.of(cancellation));

        assertEquals(
                CancellationStatus.WITHDRAWN,
                service.withdraw(maria, cancellation.getId()).status()
        );
    }

    @Test
    void withdrawingSomeoneElsesRequestLooksLikeNotFound() {
        VacationCancellation cancellation = pending(maria, vacation, "2026-11-09", "2026-11-13");
        when(cancellations.findByIdForUpdate(cancellation.getId()))
                .thenReturn(Optional.of(cancellation));

        assertEquals(
                HttpStatus.NOT_FOUND,
                rule(() -> service.withdraw(carlos, cancellation.getId())).getStatus()
        );
        assertEquals(CancellationStatus.PENDING, cancellation.getStatus());
    }

    @Test
    void aResolvedRequestCannotBeWithdrawn() {
        VacationCancellation cancellation = pending(maria, vacation, "2026-11-09", "2026-11-13");
        cancellation.setStatus(CancellationStatus.REJECTED);
        when(cancellations.findByIdForUpdate(cancellation.getId()))
                .thenReturn(Optional.of(cancellation));

        assertEquals(
                "INVALID_STATUS",
                rule(() -> service.withdraw(maria, cancellation.getId())).getCode()
        );
    }

    @Test
    void approvingARequestAppliesTheRangeAndNotifiesTheUser() {
        VacationCancellation cancellation = pending(maria, vacation, "2026-11-09", "2026-11-13");
        when(cancellations.findByIdForUpdate(cancellation.getId()))
                .thenReturn(Optional.of(cancellation));

        CancellationResult result = service.decide(
                admin,
                cancellation.getId(),
                new CancellationDecisionRequest(VacationDecision.APPROVED, "  De acuerdo  ")
        );

        assertEquals(CancellationStatus.APPROVED, cancellation.getStatus());
        assertEquals(admin.getId(), cancellation.getResolvedBy());
        assertNotNull(cancellation.getResolvedAt());
        assertEquals("De acuerdo", cancellation.getResolutionComment());
        assertEquals(5, cancellation.getReleasedWorkingDays());

        assertEquals(LocalDate.of(2026, 11, 8), vacation.getEndDate());
        assertEquals(5, vacation.getWorkingDays());
        assertEquals(1, result.vacations().size());

        verify(mail).send(
                eq("maria@example.com"),
                eq("Resolución de tu solicitud de cancelación"),
                contains("APROBADA")
        );
    }

    @Test
    void rejectingARequestLeavesTheVacationUntouched() {
        VacationCancellation cancellation = pending(maria, vacation, "2026-11-09", "2026-11-13");
        when(cancellations.findByIdForUpdate(cancellation.getId()))
                .thenReturn(Optional.of(cancellation));

        CancellationResult result = service.decide(
                admin,
                cancellation.getId(),
                new CancellationDecisionRequest(VacationDecision.REJECTED, "Sin cobertura")
        );

        assertEquals(CancellationStatus.REJECTED, cancellation.getStatus());
        assertEquals("Sin cobertura", cancellation.getResolutionComment());
        assertNull(cancellation.getReleasedWorkingDays());
        assertEquals(END, vacation.getEndDate());
        assertEquals(10, vacation.getWorkingDays());
        assertEquals(0, result.vacations().size());

        verify(mail).send(
                eq("maria@example.com"),
                anyString(),
                contains("RECHAZADA")
        );
        verify(vacations, never()).findByIdForUpdate(any());
    }

    @Test
    void decidingAResolvedRequestFails() {
        VacationCancellation cancellation = pending(maria, vacation, "2026-11-09", "2026-11-13");
        cancellation.setStatus(CancellationStatus.WITHDRAWN);
        when(cancellations.findByIdForUpdate(cancellation.getId()))
                .thenReturn(Optional.of(cancellation));

        assertEquals(
                "INVALID_STATUS",
                rule(() -> service.decide(
                        admin,
                        cancellation.getId(),
                        new CancellationDecisionRequest(VacationDecision.APPROVED, null)
                )).getCode()
        );
    }

    @Test
    void decidingUnknownRequestFails() {
        UUID id = UUID.randomUUID();
        when(cancellations.findByIdForUpdate(id)).thenReturn(Optional.empty());

        VacationRuleException exception = rule(() -> service.decide(
                admin, id, new CancellationDecisionRequest(VacationDecision.APPROVED, null)
        ));

        assertEquals("CANCELLATION_NOT_FOUND", exception.getCode());
        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
    }

    @Test
    void approvingIsBlockedWhenTheVacationIsNoLongerApproved() {
        VacationCancellation cancellation = pending(maria, vacation, "2026-11-09", "2026-11-13");
        when(cancellations.findByIdForUpdate(cancellation.getId()))
                .thenReturn(Optional.of(cancellation));
        vacation.setStatus(VacationStatus.CANCELLED);

        assertEquals(
                "INVALID_STATUS",
                rule(() -> service.decide(
                        admin,
                        cancellation.getId(),
                        new CancellationDecisionRequest(VacationDecision.APPROVED, null)
                )).getCode()
        );
        assertEquals(CancellationStatus.PENDING, cancellation.getStatus());
    }

    @Test
    void approvingIsBlockedWhenHolidaysLeaveNoWorkingDaysInTheRange() {
        VacationCancellation cancellation = pending(maria, vacation, "2026-11-09", "2026-11-09");
        when(cancellations.findByIdForUpdate(cancellation.getId()))
                .thenReturn(Optional.of(cancellation));
        when(holidays.findByDateBetween(any(), any()))
                .thenReturn(List.of(holiday(LocalDate.of(2026, 11, 9))));

        VacationRuleException exception = rule(() -> service.decide(
                admin,
                cancellation.getId(),
                new CancellationDecisionRequest(VacationDecision.APPROVED, null)
        ));

        assertEquals("NO_WORKING_DAYS", exception.getCode());
        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertEquals(CancellationStatus.PENDING, cancellation.getStatus());
    }

    @Test
    void usersSeeOnlyTheirOwnRequestsAndAdminsSeeAll() {
        VacationCancellation own = pending(maria, vacation, "2026-11-09", "2026-11-13");
        VacationCancellation other = pending(carlos, vacation, "2026-11-09", "2026-11-13");

        when(cancellations.findByUserIdOrderByCreatedAtDesc(maria.getId()))
                .thenReturn(List.of(own));
        when(cancellations.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(own, other));
        when(users.findAllById(any())).thenReturn(List.of(maria, carlos));

        assertEquals(1, service.listVisible(maria).size());
        assertEquals("María", service.listVisible(maria).get(0).userName());
        assertEquals(2, service.listVisible(admin).size());
        verify(cancellations, never()).findByUserIdOrderByCreatedAtDesc(carlos.getId());
    }
}
