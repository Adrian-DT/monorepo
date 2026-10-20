package com.yko.calendar.vacations;

import com.yko.calendar.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/vacations")
public class VacationAdminController {

    private final VacationService vacationService;
    private final VacationCancellationService cancellationService;

    public VacationAdminController(
            VacationService vacationService,
            VacationCancellationService cancellationService
    ) {
        this.vacationService = vacationService;
        this.cancellationService = cancellationService;
    }

    @PostMapping("/{id}/decision")
    public VacationResponse decide(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody VacationDecisionRequest request
    ) {
        return vacationService.decide(principal.getUser(), id, request);
    }

    @PostMapping("/{id}/cancel")
    public CancellationResult cancel(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) AdminCancelRequest request
    ) {
        return cancellationService.cancelDirectly(principal.getUser(), id, request);
    }

    @PostMapping("/cancellation-requests/{id}/decision")
    public CancellationResult decideCancellation(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody CancellationDecisionRequest request
    ) {
        return cancellationService.decide(principal.getUser(), id, request);
    }
}
