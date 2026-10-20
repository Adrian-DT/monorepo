package com.yko.calendar.vacations;

import com.yko.calendar.holidays.Holiday;
import com.yko.calendar.holidays.HolidayRepository;
import com.yko.calendar.users.User;
import com.yko.calendar.users.UserRepository;
import com.yko.calendar.users.UserRole;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VacationService {

    private static final String OVERLAP_CONSTRAINT = "ex_vacation_requests_no_overlap";

    private static final Set<VacationStatus> ACTIVE_STATUSES =
            EnumSet.of(VacationStatus.PENDING, VacationStatus.APPROVED);

    private final VacationRequestRepository vacationRepository;
    private final HolidayRepository holidayRepository;
    private final UserRepository userRepository;

    public VacationService(
            VacationRequestRepository vacationRepository,
            HolidayRepository holidayRepository,
            UserRepository userRepository
    ) {
        this.vacationRepository = vacationRepository;
        this.holidayRepository = holidayRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<VacationResponse> listVisible(User current) {
        List<VacationRequest> requests = isAdmin(current)
                ? vacationRepository.findAllByOrderByStartDateDescCreatedAtDesc()
                : vacationRepository
                        .findByUserIdOrStatusOrderByStartDateDescCreatedAtDesc(
                                current.getId(),
                                VacationStatus.APPROVED
                        );

        Map<UUID, String> names = namesFor(requests);

        return requests.stream()
                .map(request -> toResponse(request, current, names))
                .toList();
    }

    @Transactional
    public VacationResponse create(User current, VacationCreateRequest request) {
        int workingDays = countWorkingDays(request.startDate(), request.endDate());

        if (workingDays == 0) {
            throw VacationRuleException.noWorkingDays();
        }

        if (vacationRepository.existsOverlap(
                current.getId(),
                request.startDate(),
                request.endDate(),
                ACTIVE_STATUSES
        )) {
            throw VacationRuleException.overlap();
        }

        OffsetDateTime now = OffsetDateTime.now();

        VacationRequest vacation = new VacationRequest();
        vacation.setId(UUID.randomUUID());
        vacation.setUserId(current.getId());
        vacation.setStartDate(request.startDate());
        vacation.setEndDate(request.endDate());
        vacation.setWorkingDays(workingDays);
        vacation.setStatus(VacationStatus.PENDING);
        vacation.setReason(request.reason().trim());
        vacation.setCreatedAt(now);
        vacation.setUpdatedAt(now);

        try {
            vacationRepository.saveAndFlush(vacation);
        } catch (DataIntegrityViolationException exception) {
            throw translate(exception);
        }

        return toResponse(vacation, current, Map.of(current.getId(), current.getDisplayName()));
    }

    @Transactional
    public VacationResponse cancel(User current, UUID id) {
        VacationRequest vacation = vacationRepository.findById(id)
                .filter(found -> found.getUserId().equals(current.getId()))
                .orElseThrow(() -> VacationRuleException.notFound(id));

        assertPending(vacation);

        vacation.setStatus(VacationStatus.CANCELLED);
        vacation.setUpdatedAt(OffsetDateTime.now());

        vacationRepository.saveAndFlush(vacation);

        return toResponse(vacation, current, Map.of(current.getId(), current.getDisplayName()));
    }

    @Transactional
    public VacationResponse decide(
            User admin,
            UUID id,
            VacationDecisionRequest request
    ) {
        VacationRequest vacation = vacationRepository.findById(id)
                .orElseThrow(() -> VacationRuleException.notFound(id));

        assertPending(vacation);

        if (request.decision() == VacationDecision.APPROVED) {
            int workingDays = countWorkingDays(
                    vacation.getStartDate(),
                    vacation.getEndDate()
            );

            if (workingDays == 0) {
                throw VacationRuleException.noWorkingDaysOnApproval();
            }

            vacation.setWorkingDays(workingDays);
            vacation.setStatus(VacationStatus.APPROVED);
        } else {
            vacation.setStatus(VacationStatus.REJECTED);
        }

        String comment = request.adminComment() == null
                ? ""
                : request.adminComment().trim();

        OffsetDateTime now = OffsetDateTime.now();

        vacation.setAdminComment(comment.isEmpty() ? null : comment);
        vacation.setReviewedBy(admin.getId());
        vacation.setReviewedAt(now);
        vacation.setUpdatedAt(now);

        vacationRepository.saveAndFlush(vacation);

        return toResponse(vacation, admin, namesFor(List.of(vacation)));
    }

    private int countWorkingDays(LocalDate start, LocalDate end) {
        Set<LocalDate> holidays = holidayRepository.findByDateBetween(start, end)
                .stream()
                .map(Holiday::getDate)
                .collect(Collectors.toSet());

        return WorkingDayCalculator.count(start, end, holidays);
    }

    private void assertPending(VacationRequest vacation) {
        if (vacation.getStatus() != VacationStatus.PENDING) {
            throw VacationRuleException.invalidStatus();
        }
    }

    private VacationRuleException translate(DataIntegrityViolationException exception) {
        String message = String.valueOf(exception.getMostSpecificCause().getMessage());

        if (message.contains(OVERLAP_CONSTRAINT)) {
            return VacationRuleException.overlap();
        }

        throw exception;
    }

    private Map<UUID, String> namesFor(List<VacationRequest> requests) {
        Set<UUID> ids = requests.stream()
                .map(VacationRequest::getUserId)
                .collect(Collectors.toSet());

        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));
    }

    private VacationResponse toResponse(
            VacationRequest request,
            User viewer,
            Map<UUID, String> names
    ) {
        boolean privateVisible = isAdmin(viewer)
                || request.getUserId().equals(viewer.getId());

        return VacationResponse.from(
                request,
                names.getOrDefault(request.getUserId(), ""),
                privateVisible
        );
    }

    private boolean isAdmin(User user) {
        return user.getRole() == UserRole.ADMIN;
    }
}
