package com.yko.calendar.vacations;

import com.yko.calendar.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vacations")
public class VacationController {

    private final VacationService vacationService;
    private final VacationCancellationService cancellationService;

    public VacationController(
            VacationService vacationService,
            VacationCancellationService cancellationService
    ) {
        this.vacationService = vacationService;
        this.cancellationService = cancellationService;
    }

    @GetMapping
    public List<VacationResponse> list(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return vacationService.listVisible(principal.getUser());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VacationResponse create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody VacationCreateRequest request
    ) {
        return vacationService.create(principal.getUser(), request);
    }

    @PostMapping("/{id}/cancel")
    public VacationResponse cancel(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        return vacationService.cancel(principal.getUser(), id);
    }

    @GetMapping("/cancellation-requests")
    public List<CancellationResponse> listCancellationRequests(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return cancellationService.listVisible(principal.getUser());
    }

    @PostMapping("/{id}/cancellation-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public CancellationResult requestCancellation(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody CancellationCreateRequest request
    ) {
        return cancellationService.requestCancellation(principal.getUser(), id, request);
    }

    @PostMapping("/cancellation-requests/{id}/withdraw")
    public CancellationResponse withdrawCancellation(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        return cancellationService.withdraw(principal.getUser(), id);
    }
}
