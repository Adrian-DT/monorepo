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

    public VacationController(VacationService vacationService) {
        this.vacationService = vacationService;
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
}
