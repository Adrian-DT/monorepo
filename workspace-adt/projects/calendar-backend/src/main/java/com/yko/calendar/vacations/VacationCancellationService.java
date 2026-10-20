package com.yko.calendar.vacations;

import com.yko.calendar.holidays.Holiday;
import com.yko.calendar.holidays.HolidayRepository;
import com.yko.calendar.mail.MailService;
import com.yko.calendar.users.User;
import com.yko.calendar.users.UserRepository;
import com.yko.calendar.users.UserRole;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VacationCancellationService {

    private static final String PENDING_INDEX = "uk_vacation_cancellations_pending";

    private final VacationRequestRepository vacations;
    private final VacationCancellationRepository cancellations;
    private final HolidayRepository holidays;
    private final UserRepository users;
    private final MailService mailService;
    private final Clock clock;

    public VacationCancellationService(
            VacationRequestRepository vacations,
            VacationCancellationRepository cancellations,
            HolidayRepository holidays,
            UserRepository users,
            MailService mailService,
            Clock clock
    ) {
        this.vacations = vacations;
        this.cancellations = cancellations;
        this.holidays = holidays;
        this.users = users;
        this.mailService = mailService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CancellationResponse> listVisible(User current) {
        List<VacationCancellation> visible = current.getRole() == UserRole.ADMIN
                ? cancellations.findAllByOrderByCreatedAtDesc()
                : cancellations.findByUserIdOrderByCreatedAtDesc(current.getId());

        Set<UUID> ids = visible.stream()
                .map(VacationCancellation::getUserId)
                .collect(Collectors.toSet());

        var names = users.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));

        return visible.stream()
                .map(item -> CancellationResponse.from(
                        item,
                        names.getOrDefault(item.getUserId(), "")
                ))
                .toList();
    }

    @Transactional
    public CancellationResult cancelDirectly(
            User admin,
            UUID vacationId,
            AdminCancelRequest request
    ) {
        VacationRequest vacation = vacations.findByIdForUpdate(vacationId)
                .orElseThrow(() -> VacationRuleException.notFound(vacationId));

        assertApproved(vacation);

        if (cancellations.existsByVacationIdAndStatus(
                vacation.getId(),
                CancellationStatus.PENDING
        )) {
            throw VacationRuleException.cancellationRequestPending();
        }

        LocalDate from = request == null || request.fromDate() == null
                ? vacation.getStartDate()
                : request.fromDate();
        LocalDate to = request == null || request.toDate() == null
                ? vacation.getEndDate()
                : request.toDate();

        assertWithinPeriod(vacation, from, to);

        Set<LocalDate> holidayDates = holidaysOf(vacation);

        if (WorkingDayCalculator.count(from, to, holidayDates) == 0) {
            throw VacationRuleException.noWorkingDays();
        }

        OffsetDateTime now = OffsetDateTime.now(clock);

        VacationCancellation cancellation = newRecord(vacation, from, to, admin, now);
        cancellation.setStatus(CancellationStatus.APPROVED);
        cancellation.setResolvedBy(admin.getId());
        cancellation.setResolvedAt(now);
        cancellation.setResolutionComment(clean(
                request == null ? null : request.comment()
        ));

        Change change = apply(vacation, from, to, holidayDates, now);
        cancellation.setReleasedWorkingDays(change.released());

        cancellations.saveAndFlush(cancellation);

        User owner = ownerOf(vacation.getUserId());

        notifyUser(
                owner,
                "Cancelación de vacaciones",
                "Un administrador ha cancelado "
                        + describeRange(cancellation)
                        + " de tus vacaciones aprobadas ("
                        + cancellation.getOriginalStartDate()
                        + " a "
                        + cancellation.getOriginalEndDate()
                        + ")."
                        + commentLine(cancellation.getResolutionComment())
        );

        return result(cancellation, change.affected(), owner);
    }

    @Transactional
    public CancellationResult requestCancellation(
            User current,
            UUID vacationId,
            CancellationCreateRequest request
    ) {
        VacationRequest vacation = vacations.findByIdForUpdate(vacationId)
                .filter(found -> found.getUserId().equals(current.getId()))
                .orElseThrow(() -> VacationRuleException.notFound(vacationId));

        assertApproved(vacation);

        if (cancellations.existsByVacationIdAndStatus(
                vacation.getId(),
                CancellationStatus.PENDING
        )) {
            throw VacationRuleException.cancellationAlreadyRequested();
        }

        LocalDate today = LocalDate.now(clock);
        LocalDate from;
        LocalDate to;

        if (request.fromDate() == null) {
            from = vacation.getStartDate().isAfter(today)
                    ? vacation.getStartDate()
                    : today;
            to = vacation.getEndDate();

            if (from.isAfter(to)) {
                throw VacationRuleException.pastDates();
            }
        } else {
            from = request.fromDate();
            to = request.toDate();
        }

        assertWithinPeriod(vacation, from, to);

        if (from.isBefore(today)) {
            throw VacationRuleException.pastDates();
        }

        if (WorkingDayCalculator.count(from, to, holidaysOf(vacation)) == 0) {
            throw VacationRuleException.noWorkingDays();
        }

        OffsetDateTime now = OffsetDateTime.now(clock);

        VacationCancellation cancellation = newRecord(vacation, from, to, current, now);
        cancellation.setStatus(CancellationStatus.PENDING);
        cancellation.setRequestReason(request.reason().trim());

        try {
            cancellations.saveAndFlush(cancellation);
        } catch (DataIntegrityViolationException exception) {
            throw translate(exception);
        }

        for (User admin : users.findByRoleAndActiveTrue(UserRole.ADMIN)) {
            notifyUser(
                    admin,
                    "Solicitud de cancelación de vacaciones",
                    current.getDisplayName()
                            + " solicita cancelar "
                            + describeRange(cancellation)
                            + " de sus vacaciones aprobadas ("
                            + cancellation.getOriginalStartDate()
                            + " a "
                            + cancellation.getOriginalEndDate()
                            + ").\nMotivo: "
                            + cancellation.getRequestReason()
            );
        }

        return new CancellationResult(
                CancellationResponse.from(cancellation, current.getDisplayName()),
                List.of(VacationResponse.from(vacation, current.getDisplayName(), true))
        );
    }

    @Transactional
    public CancellationResponse withdraw(User current, UUID cancellationId) {
        VacationCancellation cancellation = cancellations
                .findByIdForUpdate(cancellationId)
                .filter(found -> found.getRequestedBy().equals(current.getId()))
                .orElseThrow(() -> VacationRuleException.cancellationNotFound(cancellationId));

        if (cancellation.getStatus() != CancellationStatus.PENDING) {
            throw VacationRuleException.invalidStatus();
        }

        cancellation.setStatus(CancellationStatus.WITHDRAWN);
        cancellation.setUpdatedAt(OffsetDateTime.now(clock));

        cancellations.saveAndFlush(cancellation);

        return CancellationResponse.from(cancellation, current.getDisplayName());
    }

    @Transactional
    public CancellationResult decide(
            User admin,
            UUID cancellationId,
            CancellationDecisionRequest request
    ) {
        VacationCancellation cancellation = cancellations
                .findByIdForUpdate(cancellationId)
                .orElseThrow(() -> VacationRuleException.cancellationNotFound(cancellationId));

        if (cancellation.getStatus() != CancellationStatus.PENDING) {
            throw VacationRuleException.invalidStatus();
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        List<VacationRequest> affected = List.of();

        if (request.decision() == VacationDecision.APPROVED) {
            VacationRequest vacation = vacations
                    .findByIdForUpdate(cancellation.getVacationId())
                    .orElseThrow(() -> VacationRuleException.notFound(
                            cancellation.getVacationId()
                    ));

            if (vacation.getStatus() != VacationStatus.APPROVED
                    || cancellation.getFromDate().isBefore(vacation.getStartDate())
                    || cancellation.getToDate().isAfter(vacation.getEndDate())) {
                throw VacationRuleException.invalidStatus();
            }

            Set<LocalDate> holidayDates = holidaysOf(vacation);

            if (WorkingDayCalculator.count(
                    cancellation.getFromDate(),
                    cancellation.getToDate(),
                    holidayDates
            ) == 0) {
                throw VacationRuleException.noWorkingDaysOnApproval();
            }

            Change change = apply(
                    vacation,
                    cancellation.getFromDate(),
                    cancellation.getToDate(),
                    holidayDates,
                    now
            );

            cancellation.setReleasedWorkingDays(change.released());
            cancellation.setStatus(CancellationStatus.APPROVED);
            affected = change.affected();
        } else {
            cancellation.setStatus(CancellationStatus.REJECTED);
        }

        cancellation.setResolvedBy(admin.getId());
        cancellation.setResolvedAt(now);
        cancellation.setResolutionComment(clean(request.comment()));
        cancellation.setUpdatedAt(now);

        cancellations.saveAndFlush(cancellation);

        User owner = ownerOf(cancellation.getUserId());

        notifyUser(
                owner,
                "Resolución de tu solicitud de cancelación",
                cancellation.getStatus() == CancellationStatus.APPROVED
                        ? "Tu solicitud de cancelar "
                                + describeRange(cancellation)
                                + " de tus vacaciones ha sido APROBADA."
                        : "Tu solicitud de cancelar "
                                + describeRange(cancellation)
                                + " de tus vacaciones ha sido RECHAZADA."
                                + commentLine(cancellation.getResolutionComment())
        );

        return result(cancellation, affected, owner);
    }

    private Change apply(
            VacationRequest vacation,
            LocalDate from,
            LocalDate to,
            Set<LocalDate> holidayDates,
            OffsetDateTime now
    ) {
        int original = vacation.getWorkingDays();
        List<Segment> kept = new ArrayList<>();

        if (from.isAfter(vacation.getStartDate())) {
            addSegment(kept, vacation.getStartDate(), from.minusDays(1), holidayDates);
        }

        if (to.isBefore(vacation.getEndDate())) {
            addSegment(kept, to.plusDays(1), vacation.getEndDate(), holidayDates);
        }

        int keptDays = kept.stream().mapToInt(Segment::days).sum();
        List<VacationRequest> affected = new ArrayList<>();

        if (kept.isEmpty()) {
            vacation.setStatus(VacationStatus.CANCELLED);
            vacation.setUpdatedAt(now);
            vacations.saveAndFlush(vacation);
            affected.add(vacation);
        } else {
            Segment first = kept.get(0);

            vacation.setStartDate(first.start());
            vacation.setEndDate(first.end());
            vacation.setWorkingDays(first.days());
            vacation.setUpdatedAt(now);
            vacations.saveAndFlush(vacation);
            affected.add(vacation);

            if (kept.size() > 1) {
                Segment second = kept.get(1);

                VacationRequest extra = new VacationRequest();
                extra.setId(UUID.randomUUID());
                extra.setUserId(vacation.getUserId());
                extra.setStartDate(second.start());
                extra.setEndDate(second.end());
                extra.setWorkingDays(second.days());
                extra.setStatus(VacationStatus.APPROVED);
                extra.setReason(vacation.getReason());
                extra.setAdminComment(vacation.getAdminComment());
                extra.setReviewedBy(vacation.getReviewedBy());
                extra.setReviewedAt(vacation.getReviewedAt());
                extra.setParentVacationId(vacation.getId());
                extra.setCreatedAt(vacation.getCreatedAt());
                extra.setUpdatedAt(now);

                vacations.saveAndFlush(extra);
                affected.add(extra);
            }
        }

        return new Change(affected, Math.max(0, original - keptDays));
    }

    private void addSegment(
            List<Segment> kept,
            LocalDate start,
            LocalDate end,
            Set<LocalDate> holidayDates
    ) {
        int days = WorkingDayCalculator.count(start, end, holidayDates);

        if (days > 0) {
            kept.add(new Segment(start, end, days));
        }
    }

    private VacationCancellation newRecord(
            VacationRequest vacation,
            LocalDate from,
            LocalDate to,
            User requester,
            OffsetDateTime now
    ) {
        VacationCancellation cancellation = new VacationCancellation();
        cancellation.setId(UUID.randomUUID());
        cancellation.setVacationId(vacation.getId());
        cancellation.setUserId(vacation.getUserId());
        cancellation.setFromDate(from);
        cancellation.setToDate(to);
        cancellation.setRequestedBy(requester.getId());
        cancellation.setOriginalStartDate(vacation.getStartDate());
        cancellation.setOriginalEndDate(vacation.getEndDate());
        cancellation.setOriginalWorkingDays(vacation.getWorkingDays());
        cancellation.setCreatedAt(now);
        cancellation.setUpdatedAt(now);
        return cancellation;
    }

    private void assertApproved(VacationRequest vacation) {
        if (vacation.getStatus() != VacationStatus.APPROVED) {
            throw VacationRuleException.invalidStatus();
        }
    }

    private void assertWithinPeriod(
            VacationRequest vacation,
            LocalDate from,
            LocalDate to
    ) {
        if (from.isBefore(vacation.getStartDate()) || to.isAfter(vacation.getEndDate())) {
            throw VacationRuleException.rangeOutsidePeriod();
        }
    }

    private Set<LocalDate> holidaysOf(VacationRequest vacation) {
        return holidays
                .findByDateBetween(vacation.getStartDate(), vacation.getEndDate())
                .stream()
                .map(Holiday::getDate)
                .collect(Collectors.toSet());
    }

    private VacationRuleException translate(DataIntegrityViolationException exception) {
        String message = String.valueOf(exception.getMostSpecificCause().getMessage());

        if (message.contains(PENDING_INDEX)) {
            return VacationRuleException.cancellationAlreadyRequested();
        }

        throw exception;
    }

    private User ownerOf(UUID userId) {
        return users.findById(userId).orElseGet(() -> {
            User unknown = new User();
            unknown.setId(userId);
            unknown.setDisplayName("");
            return unknown;
        });
    }

    private CancellationResult result(
            VacationCancellation cancellation,
            List<VacationRequest> affected,
            User owner
    ) {
        return new CancellationResult(
                CancellationResponse.from(cancellation, owner.getDisplayName()),
                affected.stream()
                        .map(item -> VacationResponse.from(item, owner.getDisplayName(), true))
                        .toList()
        );
    }

    private void notifyUser(User recipient, String subject, String body) {
        if (recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }

        mailService.send(recipient.getEmail(), subject, body);
    }

    private String describeRange(VacationCancellation cancellation) {
        return cancellation.getFromDate().equals(cancellation.getToDate())
                ? "el día " + cancellation.getFromDate()
                : "el periodo del "
                        + cancellation.getFromDate()
                        + " al "
                        + cancellation.getToDate();
    }

    private String commentLine(String comment) {
        return comment == null ? "" : "\nComentario: " + comment;
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        return trimmed.isEmpty() ? null : trimmed;
    }

    private record Segment(LocalDate start, LocalDate end, int days) {
    }

    private record Change(List<VacationRequest> affected, int released) {
    }
}
